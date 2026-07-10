---
trigger: always_on
---

# Futfi8 Notification Rules & Copy Lexicon

## Overview
Futfi8 has two specific alert channels:
1. **In-App Alerts:** Persisted in the DB and dispatched via live WebSockets.
2. **Email Alerts:** Transactional updates handled through Resend for high-priority items.

All features run completely on an opt-in basis. Users can modify permissions directly inside their preference panels without structural friction.

---

## The Notification Registry
These are the only valid `type` values for the database engine. Custom freeform variations are strictly rejected.

| Type Key | Delivery Path | Priority | Structural Trigger Condition |
|---|---|---|---|
| `raid_window_open` | In-App + Email | 🔴 High | Final whistle triggers a decisive result for a winning side |
| `raid_incoming` | In-App + Email | 🔴 High | Final whistle catches a home side suffering a match defeat |
| `raid_window_closing` | In-App | 🟡 Medium | Active raiders who haven't dispatched their entry post yet (30m left) |
| `raid_window_closed` | In-App | 🟢 Low | Active window hits its maximum 2-hour timeline mark |
| `match_thread_open` | In-App | 🟡 Medium | Thread space goes active 30 minutes prior to scheduled match kick-offs |
| `post_upvoted` | In-App | 🟢 Low | User take scales past specific viral engagement milestone markers |
| `post_replied` | In-App | 🟡 Medium | Active user commentary receives subsequent direct chat replies |
| `fan_cred_milestone` | In-App + Email | 🟡 Medium | Background processing points update unlocks a new loyalty tier |
| `weekly_digest` | Email Only | 🟢 Low | Global overview dispatch engine fires every Sunday morning |
| `club_switch_confirmed` | In-App + Email | 🟢 Low | 30-day structural loyalty change processing tasks finish execution |

---

## Branding Copy Systems

### `raid_window_open`
- **Title:** `Get in there. ⚔️`
- **Body:** `{LosingClub}'s locker room is open. You've got 2 hours.`
- **Routing Link:** `/locker-room/{defending_club_slug}?raid={raidWindowId}`

### `raid_incoming`
- **Title:** `Incoming raid. 🚨`
- **Body:** `{WinningClub} fans are coming. Defend your locker room.`
- **Routing Link:** `/locker-room/{defending_club_slug}`

### `raid_window_closing`
- **Title:** `30 minutes left in the raid.`
- **Body:** `You haven't posted yet. Clock is ticking.`
- **Routing Link:** `/locker-room/{defending_club_slug}?raid={raidWindowId}`

### `raid_window_closed`
- **Title:** `Raid over.`
- **Body:** `The {WinningClub} raid is done. Check the Raid History.`
- **Routing Link:** `/locker-room/{club_slug}/raid-history`

### `match_thread_open`
- **Title:** `{HomeTeam} vs {AwayTeam} — thread is live.`
- **Body:** `Drop your pre-match take. Kicks off in 30 mins.`
- **Routing Link:** `/match/{matchId}`

### `post_upvoted`
- **Title:** `Your take is getting heat. 🔥`
- **Body:** `{count} upvotes on your post.`
- **Routing Link:** `/locker-room/{club_slug}?post={postId}`
- **Throttling Constraints:** Exclusively dispatch alerts at milestone increments of **5, 25, 100, 250, and 500 upvotes**.

### `post_replied`
- **Title:** `{username} replied to your take.`
- **Body:** `{preview of reply — clamp layout to first 80 chars}`
- **Routing Link:** `/locker-room/{club_slug}?post={postId}`

### `fan_cred_milestone`
- **Title:** `New badge unlocked. 🏆`
- **Body:** `You hit {score} Fan Cred. You're a {badge_level} now.`
- **Routing Link:** `/profile/{userId}`
- **Milestone Caps:** Regular (`100`), Veteran (`500`), Legend (`1000`), OG (`2000`).

### `weekly_digest`
- **Subject Line:** `This week in your locker room — {club_name}`
- **Body Content:** Top 3 viral takes over a 7-day period + upcoming matchday calendar tables.
- **Dispatch Schedule:** Every Sunday at **10:00 AM WAT (UTC+1)** based on core location metrics.

### `club_switch_confirmed`
- **Title:** `Welcome to {NewClub}.`
- **Body:** `Your new locker room is ready. Fan Cred starts at 0.`
- **Routing Link:** `/locker-room/{new_club_slug}`

---

## Preference Data Tables
```sql
create table public.notification_preferences (
  user_id               uuid references public.users(id) on delete cascade primary key,
  raid_window_open      boolean default true,
  raid_incoming         boolean default true,
  raid_window_closing   boolean default true,
  raid_window_closed    boolean default false, -- Low priority default off
  match_thread_open     boolean default true,
  post_upvoted          boolean default true,
  post_replied          boolean default true,
  fan_cred_milestone    boolean default true,
  weekly_digest         boolean default true,
  club_switch_confirmed boolean default true,
  updated_at            timestamptz default now()
);