# edge-cases.md — Edge Cases & Unexpected Scenarios

## Overview

Edge cases are where products break on matchday. This file documents
every known unusual scenario in Futfi8, what the correct behaviour is,
and how the code handles it. When vibecoding any feature, check this
file for edge cases that apply to what you're building.

When vibecoding this feature, always have these files active:
- `project.md`
- `database-mechanics.md`
- `database-schema.md`
- `access-control.md`
- `football-api-client.md`
- `football-api-polling.md`

---

## Match & Result Edge Cases

### EC-01: Draw Result
**Scenario:** Match ends 1-1. No winner.

**Correct behaviour:**
- `matches.winner_club_id` = null
- No raid window created
- Match threads close normally
- No notifications sent for raid
- Both clubs' Fan Cred unaffected by result

**Implementation check:**
```ts
// In onMatchFinished — always null-check winner
if (winnerClubId) {
  await createRaidWindow(matchId, winnerClubId)
}
// If null — do nothing. Draw = no raid.
```

---

### EC-02: Match Postponed Before Kick-off
**Scenario:** Match postponed before it goes live.

**Correct behaviour:**
- `matches.status` = `postponed`
- No match threads created (they haven't been created yet)
- No raid eligibility snapshot taken
- No raid window ever created
- If notifications were sent for match thread — send cancellation

**Implementation check:**
```ts
// In processFixtureUpdate — handle postponed transition
if (match.status !== 'postponed' && newStatus === 'postponed') {
  await onMatchPostponed(match.id)
}

async function onMatchPostponed(matchId: string) {
  // Close any open match threads
  await closeMatchThreads(matchId)
  // No raid window — nothing more to do
}
```

---

### EC-03: Match Postponed Mid-Game
**Scenario:** Match abandoned after 60 minutes due to crowd trouble or weather.

**API-Football status codes for abandonment:** `ABD`, `CANC`, `AWD`, `WO`

**Correct behaviour:**
- `matches.status` = `postponed`
- Open match threads → closed immediately
- No raid window — abandoned match has no valid result
- Partial scores are cleared: `home_score = null`, `away_score = null`
- No Fan Cred adjustments for the abandoned match

**Implementation check:**
```ts
const postponedStatuses = ['PST', 'CANC', 'ABD', 'AWD', 'WO']
// mapFixtureStatus maps all these to 'postponed'
// onMatchPostponed handles the rest
```

---

### EC-04: API Result Delayed
**Scenario:** API-Football is slow to confirm final result.
Match ended 45+ minutes ago but status still shows `2H`.

**Correct behaviour:**
- Poll continues every 2 minutes
- Raid window opens the moment status flips to `FT` — not at estimated full-time
- Raid window duration is always 2 hours from `opens_at` — not from actual FT
- No special handling needed — the polling loop handles it automatically

**Key rule:** Never calculate expected FT time and trigger raids based on
`kickoff_at + 110 minutes`. Always wait for confirmed API status.

---

### EC-05: Result Reversal After Raid Window Opens
**Scenario:** VAR review or administrative decision reverses result
after raid window has already opened.

**Correct behaviour:**
- Raid window stays open and closes normally
- Raid posts are archived as normal
- Result reversal is NOT applied retroactively
- This is a known edge case — accept it, do not build complex reversal logic
- Log a warning for manual review if status changes from `finished` back

**Implementation check:**
```ts
// In processFixtureUpdate
if (match.status === 'finished' && newStatus !== 'finished') {
  // Status is changing FROM finished — unusual, log it
  console.warn('[processFixtureUpdate] Status regression detected', {
    matchId: match.id,
    from: match.status,
    to: newStatus,
  })
  // Do NOT close raid windows or reverse anything automatically
}
```

---

## Raid Window Edge Cases

### EC-06: Zero Eligible Raiders
**Scenario:** Winning club's locker room has no members who were
present at kick-off (all joined after the match started).

**Correct behaviour:**
- Raid window is created normally
- `raid_eligibility` table has zero records for this window
- Raid window stays open for 2 hours
- No raid posts appear in the defending room
- Window closes normally via cron job
- No error — this is valid, just empty

**Implementation check:**
```ts
// In populateRaidEligibility
if (!eligible || eligible.length === 0) {
  console.warn('[populateRaidEligibility] No eligible raiders', {
    raidWindowId, matchId, raidingClubId,
  })
  return // No records to insert — window exists but empty
}
```

---

### EC-07: Two Matches Finishing Simultaneously
**Scenario:** Chelsea vs Arsenal and Liverpool vs Man City both finish
at the same time. Two raid windows active at once.

**Correct behaviour:**
- Two completely independent raid windows created
- Each has its own raiding/defending clubs and rooms
- Both UI contexts active simultaneously for affected clubs
- Arsenal fans can see Chelsea is raiding them AND they can raid
  Chelsea (if Arsenal won a different match) — independent states
- No system conflict — `raid_windows` rows are separate

**Implementation check:**
```ts
// Promise.allSettled in poll-matches ensures all fixtures processed
const settled = await Promise.allSettled(
  apiFixtures.map(fixture => processFixtureUpdate(fixture))
)
// Each fixture processed independently — no shared state
```

---

### EC-08: Raider Tries to Post After Window Closes
**Scenario:** User has the raid interface open, window closes while they
are typing their post. They submit after `closes_at`.

**Correct behaviour:**
- API rejects the post — `422 RAID_WINDOW_CLOSED`
- Client shows error toast — "The raid window has closed."
- UI updates to show "Raid over" state
- The `closes_at` check in the RPC function is the final authority

**Implementation check:**
```ts
// In create_raid_post RPC — check closes_at directly
-- inside the SQL function:
if now() > (select closes_at from raid_windows where id = p_raid_window_id) then
  raise exception 'RAID_WINDOW_CLOSED';
end if;
```

The client-side countdown provides UX warning, but the server
is always the source of truth.

---

### EC-09: Cron Job Misses a Raid Window Closing
**Scenario:** Cron job fails or is delayed. A raid window should have
closed 8 minutes ago but `status` is still `active`.

**Correct behaviour:**
- Next cron run (within 5 minutes) detects `closes_at <= now()` AND `status = 'active'`
- Closes the window — no data loss, no double-close
- The check is idempotent — closing an already-closed window is a no-op

**Key rule:** Always use `closes_at` as the source of truth, not `status`.
The `closes_at` timestamp is set at creation and never changes.

```ts
// Idempotent close check
const { data: expiredWindows } = await supabase
  .from('raid_windows')
  .select('*')
  .eq('status', 'active')        // Has not been closed yet
  .lte('closes_at', now)         // AND the time has passed
```

---

## User Behaviour Edge Cases

### EC-10: User Joins Club After Kick-off to Raid
**Scenario:** Match is live. Arsenal vs Chelsea 1-0. A non-member
sees Arsenal winning and joins the Arsenal locker room to get raid rights.

**Correct behaviour:**
- User joins Arsenal locker room — membership created normally
- BUT: `match_eligibility_snapshot` was taken at kick-off, before they joined
- Their `user_id` is NOT in the snapshot → NOT in `raid_eligibility`
- API rejects raid post — `403 RAID_NOT_ELIGIBLE`
- UI should show a message: "You must have been a member before kick-off to raid."

**This is intentional design — cannot be bypassed.**

---

### EC-11: User Switches Club During Active Raid Window
**Scenario:** User is a Chelsea fan. Chelsea just lost to Arsenal.
Arsenal raid is active. User switches to Arsenal to try and raid Chelsea.

**Correct behaviour:**
- Club switch is processed — new Arsenal membership created
- But their `user_id` is NOT in the `raid_eligibility` table for this window
  (they weren't Arsenal members at kick-off)
- Raid post attempt → `403 RAID_NOT_ELIGIBLE`
- 30-day club switch cooldown also applies — but even without it, eligibility check blocks them

**This edge case is handled naturally by the eligibility snapshot system.**

---

### EC-12: User Deletes Account During Active Raid Window
**Scenario:** A user posts a raid take, then deletes their account
before the window closes.

**Correct behaviour:**
- Raid post remains visible as `[deleted]` author
- `posts.author_id` is set to null (cascade behaviour)
- Raid history preserves the post content — community continuity
- Fan Cred for the deleted account is zeroed
- Raid window closes normally

**Implementation check:**
```sql
-- In posts table definition:
author_id uuid references public.users(id) on delete set null
-- Ensures posts survive user deletion
```

---

### EC-13: User Posts Raid Take, Gets Banned Mid-Window
**Scenario:** User posts a raid take. It violates content rules.
Moderator removes it and third strike issues a permanent ban.
The raid window is still open.

**Correct behaviour:**
- Raid post is soft-deleted (`is_removed = true`)
- User's account is banned
- `raid_eligibility.has_raided` = true — they used their slot
- Even if ban is lifted later, their raid slot for this window is gone
- `raid_eligibility` is not reset on ban — this is correct

---

### EC-14: Simultaneous Raid Post Attempts
**Scenario:** A raider has the interface open on two devices/tabs.
They submit their one post simultaneously from both.

**Correct behaviour:**
- The `create_raid_post` RPC function runs atomically
- First transaction succeeds: `has_raided` flips to `true`
- Second transaction runs, checks `has_raided = false` — finds `true`
- Second transaction raises `RAID_NOT_ELIGIBLE_OR_USED`
- One post created, not two

**The RPC atomicity is what prevents double-posting.**

---

## Content & Feed Edge Cases

### EC-15: Post Content is Empty After Sanitisation
**Scenario:** User submits a post that only contains HTML tags
or special characters. After `sanitiseContent()`, the string is empty.

**Correct behaviour:**
- Zod validation rejects it — `z.string().min(1)`
- Returns `400 VALIDATION_ERROR`
- Sanitisation runs before Zod validation in the route
- Never insert an empty post into the database

**Implementation check:**
```ts
const sanitisedContent = sanitiseContent(parsed.data.content)
if (sanitisedContent.trim().length === 0) {
  return NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Post cannot be empty.' } },
    { status: 400 }
  )
}
```

---

### EC-16: Upvote Count Goes Negative
**Scenario:** A bug or race condition causes `upvote_count` to
decrement below zero.

**Correct behaviour:**
- The DB trigger uses `upvote_count - 1` — can theoretically go negative
- Add a check constraint to the DB: `upvote_count >= 0`
- The `adjustFanCred` function already floors at 0 — same pattern here

**Implementation check:**
```sql
alter table public.posts
  add constraint upvote_count_non_negative check (upvote_count >= 0);
```

---

### EC-17: Realtime Message for Deleted Post
**Scenario:** A post is soft-deleted while a user has the locker room
open. The Realtime UPDATE event fires for `is_removed = true`.

**Correct behaviour:**
- Client receives UPDATE event
- Checks `payload.new.is_removed === true`
- Replaces the post card with `RemovedPostPlaceholder`
- Does not remove the item from the list — preserves feed structure

**Implementation check:**
```ts
// In locker room feed realtime handler
.on('postgres_changes', { event: 'UPDATE', ... }, (payload) => {
  setPosts(prev => prev.map(p =>
    p.id === payload.new.id
      ? { ...p, ...payload.new }  // Updates is_removed to true
      : p
  ))
  // PostCard checks is_removed and renders placeholder automatically
})
```

---

### EC-18: Match Thread Gets Posts After Close
**Scenario:** Realtime event delivers a post to a client whose
match thread just closed server-side, but the client UI hasn't
updated yet.

**Correct behaviour:**
- Server rejects new post attempts with `422 MATCH_THREAD_CLOSED`
- Client receives error → shows toast → disables composer
- Old posts already in the feed remain visible
- Thread status is re-fetched on the next page focus

---

## Notification Edge Cases

### EC-19: Notification Sent to User Who Deleted Account
**Scenario:** A bulk notification job (e.g. raid notifications)
runs after a user deletes their account mid-loop.

**Correct behaviour:**
- Supabase insert will fail (foreign key on `user_id`)
- `createBulkNotifications` uses `Promise.allSettled` pattern
- Failed inserts are logged but don't abort the batch
- Other members still receive their notifications

**Implementation check:**
```ts
// In createBulkNotifications — handle foreign key errors gracefully
try {
  await supabase.from('notifications').insert(batch)
} catch (err) {
  // Log but don't throw — deleted users cause FK violations
  console.warn('[createBulkNotifications] Insert failed', { err })
}
```

---

### EC-20: Weekly Digest Sent to New User Who Just Joined
**Scenario:** User joins Saturday night. Digest sends Sunday morning.
They have no posts, no Fan Cred, barely explored the app.

**Correct behaviour:**
- Digest is sent if `notification_preferences.weekly_digest = true` (default)
- For new users with no locker room posts — the digest still sends
  with upcoming fixtures only (top posts section may be empty)
- Empty top posts → show "No top takes this week yet." in the email
- This is acceptable — it introduces the feature and upcoming fixtures

---

## Club Data Edge Cases

### EC-21: Club Gets Relegated / Promoted
**Scenario:** End of season — a club gets relegated from the EPL.

**Correct behaviour at season end:**
- The `clubs` table is static — do not delete relegated clubs
- Their locker room stays active — fans don't lose their community
- New season: removed club's fixtures stop appearing (no API data)
- Promoted club added to `clubs` table in pre-season migration
- This requires manual admin action each season — document in runbook

---

## Edge Case Quick Reference

| ID | Scenario | Handling |
|---|---|---|
| EC-01 | Draw result | No raid window — `winner_club_id` null check |
| EC-02 | Match postponed before KO | No threads, no snapshot, no raid |
| EC-03 | Match abandoned mid-game | Close threads, no raid |
| EC-04 | API result delayed | Wait for confirmed status — never estimate |
| EC-05 | Result reversal after raid | Raid stands — log warning, no reversal |
| EC-06 | Zero eligible raiders | Window opens empty — not an error |
| EC-07 | Two simultaneous raids | Independent windows — no conflict |
| EC-08 | Post after window closes | `closes_at` check in RPC blocks it |
| EC-09 | Cron misses window close | Next run catches it — idempotent |
| EC-10 | Join after kick-off to raid | Snapshot excludes them — RAID_NOT_ELIGIBLE |
| EC-11 | Switch club to raid | Same as EC-10 — snapshot blocks it |
| EC-12 | Delete account during raid | Post stays as [deleted] — window unaffected |
| EC-13 | Banned mid-raid-window | Slot used — not refunded |
| EC-14 | Double-post raid attempt | RPC atomicity prevents it |
| EC-15 | Empty post after sanitise | Zod min(1) catches it |
| EC-16 | Negative upvote count | DB check constraint prevents it |
| EC-17 | Realtime update for deleted post | Client renders placeholder |
| EC-18 | Post to closed thread | Server rejects, client disables composer |
| EC-19 | Notification to deleted user | FK error caught, batch continues |
| EC-20 | Digest to brand new user | Sends with fixtures — empty posts section ok |
| EC-21 | Club relegated | Manual migration — never delete locker rooms |
