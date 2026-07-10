---
trigger: always_on
---

# access-control.md — Futfi8 Post Access & Permission Rules

## Overview

Access control in Futfi8 is the most business-critical logic outside of
the raid mechanic itself. Who can post where, and when, determines the
entire community experience. Every post creation request must pass through
these checks in this exact order before touching the database.

Access control is enforced at the API layer — never trust the client to
enforce these rules. The database RLS policies are the safety net, but
the API route is where the real logic lives.

---

## The Access Matrix

| Post Type | Who Can Post | Where | When |
|---|---|---|---|
| `standard` | Home club members only | Their own locker room | Any time |
| `match_thread` | Home club members only | Their own match thread | While thread is `open` |
| `raid` | Eligible raiders only | Defending locker room | During active raid window only |
| `hot_take` | Any authenticated user | Global hot take board | Any time |
| Reply to raid post | Any member of defending club | Their own locker room | Any time (even after window closes) |

---

## Check Order for Every Post Request

Every `POST /api/posts` request must run these checks in this exact order.
Fail fast — return as soon as any check fails. Never run all checks and
batch errors.

```
1. Is the user authenticated?
   → No: 401 UNAUTHORIZED

2. Has the post content passed Perspective API toxicity check?
   → Flagged: 422 CONTENT_FLAGGED

3. Is the post content within 500 character limit?
   → Over: 400 POST_TOO_LONG

4. What is the post type?
   → Route to the correct check block below
```

---

## Check Block: `standard` Post

```
1. Does the locker_room_id exist?
   → No: 404 NOT_FOUND

2. Is the user a member of this locker room (check memberships table)?
   → No: 403 FORBIDDEN ("You can only post in your own locker room.")

3. Is the user's home_club_id the same as this locker room's club_id?
   → No: 403 FORBIDDEN

✓ All checks passed → insert post
```

---

## Check Block: `match_thread` Post

```
1. Does the match_thread_id exist?
   → No: 404 NOT_FOUND

2. Is the match thread status = 'open'?
   → No (scheduled or closed): 422 MATCH_THREAD_CLOSED

3. Does the locker_room_id on the match thread belong to the user's club?
   → No: 403 FORBIDDEN

4. Is the user a member of this locker room?
   → No: 403 FORBIDDEN

✓ All checks passed → insert post
```

---

## Check Block: `raid` Post

This is the most complex check block. Every step is mandatory.

```
1. Does the raid_window_id exist?
   → No: 404 NOT_FOUND

2. Is the raid window status = 'active'?
   → No (closed): 422 RAID_WINDOW_CLOSED

3. Is now() before raid_window.closes_at?
   → No (expired): 422 RAID_WINDOW_CLOSED
   Note: Check both status AND closes_at — status may not have been
   updated yet by the cron job. closes_at is the source of truth.

4. Is the user in the raid_eligibility table for this raid_window_id?
   → No: 403 RAID_NOT_ELIGIBLE
   ("You must have been a member before kick-off to raid.")

5. Is raid_eligibility.has_raided = false for this user + window?
   → has_raided = true: 422 RAID_ALREADY_USED
   ("You've already posted in this raid window.")

6. Is the user's age >= 16?
   → Under 16: 403 AGE_RESTRICTED

✓ All checks passed →
  - Insert post with is_raid_post = true
  - Update raid_eligibility: set has_raided = true, raided_at = now()
  - These two operations must be in the same transaction
```

### Raid Post Transaction

The raid post insert and eligibility update must be atomic.
If either fails, both must roll back.

```ts
// Use Supabase RPC for atomic raid post creation
// supabase/functions/create_raid_post.sql

create or replace function create_raid_post(
  p_author_id       uuid,
  p_content         text,
  p_locker_room_id  uuid,
  p_raid_window_id  uuid,
  p_match_id        uuid
)
returns json as $$
declare
  v_post posts%rowtype;
begin
  -- Double-check eligibility inside transaction
  if not exists (
    select 1 from raid_eligibility
    where raid_window_id = p_raid_window_id
      and user_id = p_author_id
      and has_raided = false
  ) then
    raise exception 'RAID_NOT_ELIGIBLE_OR_USED';
  end if;

  -- Insert post
  insert into posts (
    author_id, content, locker_room_id, raid_window_id,
    match_id, type, is_raid_post
  )
  values (
    p_author_id, p_content, p_locker_room_id, p_raid_window_id,
    p_match_id, 'raid', true
  )
  returning * into v_post;

  -- Mark eligibility as used
  update raid_eligibility
  set has_raided = true, raided_at = now()
  where raid_window_id = p_raid_window_id
    and user_id = p_author_id;

  return row_to_json(v_post);
end;
$$ language plpgsql security definer;
```

Call via:
```ts
const { data, error } = await supabase.rpc('create_raid_post', {
  p_author_id: user.id,
  p_content: content,
  p_locker_room_id: defendingLockerRoomId,
  p_raid_window_id: raidWindowId,
  p_match_id: matchId,
})
```

---

## Check Block: `hot_take` Post

```
1. Is the user authenticated?
   → Already checked globally — if here, yes.

2. Is content within 500 chars and passed toxicity check?
   → Already checked globally.

✓ All checks passed → insert post with type = 'hot_take', locker_room_id = null
```

Hot takes have the fewest restrictions by design — this is the global
open floor. No club membership required.

---

## Raid Eligibility Snapshot

The raid eligibility snapshot is taken at match kick-off — not at raid
window creation. This is a subtle but important distinction.

**Why at kick-off, not at result?**
If a user joins a winning club's locker room after the final whistle
(because they saw the result and want to raid), they should not get
raid rights. The snapshot must be taken before anyone knows the result.

### Snapshot Job

Runs as part of `POST /api/cron/open-match-threads` at kick-off time:

```ts
// When a match goes live — snapshot all members of both clubs
async function snapshotRaidEligibility(matchId: string) {
  // Get both clubs for this match
  const match = await getMatch(matchId)

  // Get current members of home locker room
  const homeMembers = await getMemberships(match.home_locker_room_id)
  // Get current members of away locker room
  const awayMembers = await getMemberships(match.away_locker_room_id)

  // We don't know who will win yet — snapshot BOTH clubs' members
  // When the raid window is created, we filter to winning club only
  const eligibilityRecords = [
    ...homeMembers.map(m => ({
      match_id: matchId,
      user_id: m.user_id,
      club_id: match.home_club_id,
    })),
    ...awayMembers.map(m => ({
      match_id: matchId,
      user_id: m.user_id,
      club_id: match.away_club_id,
    })),
  ]

  await supabase.from('match_eligibility_snapshot').insert(eligibilityRecords)
}
```

**Note:** Use a `match_eligibility_snapshot` table as the pre-match snapshot store.
When the raid window is created (on result), pull from this snapshot — filtered
to the winning club — and populate `raid_eligibility`.

---

## Read Permissions

Reading is generally open — Futfi8 is a public-facing community, not a
private social network. The content is the product.

| Content | Who Can Read |
|---|---|
| Locker room feed (standard posts) | Anyone — including unauthenticated users |
| Raid posts | Anyone — visible in locker room and raid history |
| Match threads | Anyone |
| Hot takes | Anyone |
| Member list | Anyone |
| User profile | Anyone |
| Notifications | Authenticated user — own only |
| Reports | Moderators only |

Unauthenticated users can browse and read all public content. They hit
a sign-up prompt when they try to post, react, or join.

---

## Moderation Permissions

| Action | Who Can Do It |
|---|---|
| Remove any post | Locker room moderator + admins |
| Remove own post | Post author (soft delete) |
| Mute a member | Locker room moderator |
| Ban a user | Admin only |
| Review reports | Locker room moderator + admins |
| Appoint moderators | Admin only |

### Moderator Eligibility
Locker room moderators are appointed from the top Fan Cred Score users
in each locker room. Minimum threshold: 500 Fan Cred Score.

```ts
// Check if user is moderator for a locker room
async function isModerator(userId: string, lockerRoomId: string): Promise<boolean> {
  const { data } = await supabase
    .from('moderators')
    .select('id')
    .eq('user_id', userId)
    .eq('locker_room_id', lockerRoomId)
    .single()
  return !!data
}
```

---

## Club Switch Access Rules

Users may switch their home club once every 30 days.

```ts
async function canSwitchClub(userId: string): Promise<{ allowed: boolean; retryAt?: Date }> {
  const { data: user } = await supabase
    .from('users')
    .select('club_switched_at')
    .eq('id', userId)
    .single()

  if (!user?.club_switched_at) return { allowed: true }

  const cooldownEnd = new Date(user.club_switched_at)
  cooldownEnd.setDate(cooldownEnd.getDate() + 30)

  if (new Date() < cooldownEnd) {
    return { allowed: false, retryAt: cooldownEnd }
  }

  return { allowed: true }
}
```

On switch:
- Old membership is archived (add `left_at` timestamp — do not delete)
- New membership is created
- Fan Cred Score on old club is frozen — not transferred
- New club score starts at 0
- `users.club_switched_at` updated to `now()`
- `users.home_club_id` updated to new club

---

## Access Control Rules Summary

1. Access checks always run server-side in the API route — never client-only
2. Raid check order is mandatory — check window status AND closes_at, not just status
3. Raid post creation and eligibility update must be atomic — use an RPC function
4. Raid eligibility snapshot is taken at kick-off — not at result
5. Hot takes are the only post type with no club membership requirement
6. Read access is open to everyone — authentication required only to write
7. Club switches have a 30-day cooldown — old membership archived, not deleted
8. Moderator status is checked per locker room — not globally
9. Age gate (under 16) is enforced on raid posts — not on other post types
10. The source of truth for raid window expiry is `closes_at` — not `status` alone
