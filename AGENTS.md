# Futfi8 — Agent Context

> **The football. The fight.**
> Club-based football fan community platform for Premier League fans.
> Built mobile-first for the Nigerian & African market.

---

## What This Project Is

Futfi8 is a matchday-powered community platform. Each of the 20 Premier League clubs has a **Locker Room** — a dedicated space where fans post takes, react to matches, and build reputation. The signature mechanic is the **Raid**: when a club wins, their fans earn a 2-hour window to enter the losing club's locker room and post a single take. Results drive community events. Wins earn rights. Losses demand defence.

This is **not** a scores app. Not a stats platform. It is a living, tribal, reputation-driven community built around one truth: football fans are the most entertaining people on the internet.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (monorepo) |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth — email + Google OAuth, JWT handled automatically |
| **Realtime** | Supabase Realtime — WebSocket subscriptions on posts table |
| **File Storage** | Supabase Storage — avatars, club crests |
| **Hosting** | Vercel — frontend + API routes |
| **Scheduled Jobs** | Vercel Cron Jobs — raid window lifecycle, digest emails |
| **Email** | Nodemailer — SMTP (Gmail, etc.) |
| **Football Data** | API-Football (RapidAPI) — fixtures, live scores, result confirmation |
| **Content Moderation** | Hugging Face Inference API (unitary/toxic-bert) — toxicity scoring |

---

## Project Structure

```
futfi8/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (main)/
│   │   ├── locker-room/[clubId]/
│   │   ├── hot-takes/
│   │   └── notifications/
│   ├── api/
│   │   ├── auth/
│   │   ├── posts/
│   │   ├── raids/
│   │   ├── matches/
│   │   ├── clubs/
│   │   └── cron/
│   └── layout.tsx
├── components/
│   ├── locker-room/
│   ├── raid/
│   ├── match-thread/
│   ├── hot-takes/
│   ├── notifications/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── football-api/
│   └── utils/
├── hooks/
├── types/
├── .agents/
│   └── rules/
│       ├── architecture.md
│       ├── code-style.md
│       ├── design-system.md
│       └── security.md
├── skills/
│   ├── component-builder/SKILL.md
│   ├── api-route-scaffolder/SKILL.md
│   └── db-migration-runner/SKILL.md
└── workflows/
    ├── new-component.md
    └── new-api-route.md
```

---

## Core Domain Concepts

### Locker Room
The primary community unit. One per club (20 total for EPL). Users belong to exactly one home locker room. Contains: live feed, Raid History tab, Members leaderboard, Fixtures tab.

### Raid Window
Triggered when a match result is confirmed (wins only — draws do not trigger raids). Winning club's members get 2 hours to post ONE take in the losing club's locker room. Raid posts are archived after the window closes. Eligibility: must have joined the winning locker room **before** kick-off.

### Match Thread
Auto-created 30 minutes before each Premier League fixture. Active through final whistle + 2 hours. Divided into pre-match, live, and post-match phases.

### Fan Cred Score
Per-user, per-locker-room reputation score. Non-transferable across clubs. Drives the Members leaderboard and unlocks cosmetic badges (OG at 500, Legend at 2,000).

### Hot Take Board
Global cross-club feed. Any registered user can post here, any time. Primary retention driver on non-matchdays.

---

## Data Model (Core Entities)

```typescript
User         { id, email, username, avatar_url, created_at, home_club_id }
Club         { id, name, short_name, crest_url, primary_color, secondary_color, league_id }
LockerRoom   { id, club_id, member_count, created_at }
Membership   { id, user_id, locker_room_id, joined_at, fan_cred_score, badge_level }
Post         { id, author_id, locker_room_id, content, type, match_id, created_at, upvote_count, is_raid_post, raid_window_id }
Match        { id, home_club_id, away_club_id, kickoff_at, status, home_score, away_score, api_match_id }
RaidWindow   { id, match_id, raiding_club_id, defending_club_id, opens_at, closes_at, status }
MatchThread  { id, match_id, locker_room_id, opens_at, closes_at, status }
Reaction     { id, user_id, post_id, type, created_at }
Notification { id, user_id, type, reference_id, read, created_at }
```

Post types: `standard | raid | match_thread | hot_take`
Reaction types: `upvote | fire | laugh | rage`
RaidWindow status: `active | closed`
Match status: `scheduled | live | finished`

---

## Post Access Rules

| Post Type | Who Can Post |
|---|---|
| Standard post | Home locker room members only |
| Raid post | Members of winning locker room, during active raid window, one post per user per window |
| Match thread post | Home locker room members only, while thread is active |
| Hot take | Any registered user, any time |
| Reply to raid post | Defending locker room members during window; all members after window closes |

---

## Key Business Rules (Non-Negotiable)

1. **One raid post per user per window** — hard enforced at DB level (unique constraint on `user_id + raid_window_id`)
2. **Raid eligibility requires pre-kickoff membership** — check `membership.joined_at < match.kickoff_at`
3. **Draws never trigger raids** — only home win or away win
4. **Club switch allowed once per 30 days** — enforce in API, reset old Cred score on switch
5. **Under-16 users restricted from raid mechanic** — age gate at registration
6. **Raid window duration is always 2 hours** — even if API result is delayed
7. **Raid posts are never deleted** after window closes — archived, always readable
8. **Fan Cred Score is per-club, non-transferable** — separate score per locker room

---

## Scheduled Jobs (Vercel Cron)

| Job | Schedule | Action |
|---|---|---|
| `poll-match-results` | Every 2 min during live matches | Call API-Football, update match status, trigger raid window on finish |
| `close-raid-windows` | Every 5 min | Seal expired raid windows, archive posts, recalculate Fan Cred |
| `open-match-threads` | Every 5 min | Auto-create match threads 30 min before kick-off |
| `close-match-threads` | Every 5 min | Close threads 2 hrs after final whistle |
| `daily-cred-recalc` | 00:00 UTC daily | Recalculate Fan Cred scores globally |
| `weekly-digest` | Monday 08:00 UTC | Send top takes digest via Resend |

---

## Fan Cred Score Calculation

| Event | Cred Delta |
|---|---|
| Post receives upvote | +2 |
| Raid post beats defending reply in upvotes | +5 (raider) |
| Defending reply beats raid post in upvotes | +5 (defender) |
| Consecutive matchday participation (7 matches) | +10 bonus |
| Post removed by moderator | -10 |

---

## Agent Rules Index

| File | Scope |
|---|---|
| `.agents/rules/architecture.md` | System design, API patterns, data flow decisions |
| `.agents/rules/code-style.md` | TypeScript conventions, naming, file structure, linting |
| `.agents/rules/design-system.md` | Visual language, Tailwind tokens, component patterns |
| `.agents/rules/security.md` | Auth guards, input validation, rate limiting, content moderation |

## Skills Index

| File | Use When |
|---|---|
| `skills/component-builder/SKILL.md` | Building any UI component |
| `skills/api-route-scaffolder/SKILL.md` | Creating new API routes |
| `skills/db-migration-runner/SKILL.md` | Adding or modifying database schema |

---

## Performance Targets

- Sub-2-second page load on mobile on Nigerian 4G
- Design for 390px viewport first (Android mobile-first)
- Progressive enhancement to desktop
- Supabase Realtime for live posts — no custom WebSocket server at MVP
