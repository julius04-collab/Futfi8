---
trigger: always_on
---

# Futfi8 Database Schema Reference

## Overview
Futfi8 uses PostgreSQL via Supabase as the primary database. Row Level Security (RLS) is enabled on every single table — no exceptions. 

All schema changes must be made via structural Supabase migrations — never edited directly inside the dashboard interface on production clients. After every single schema modification, regenerate local TypeScript typings:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
Tables & Relations
users
Extends Supabase Auth's native auth.users configuration schema layer. Public profile data only.

SQL
create table public.users (
  id               uuid references auth.users(id) on delete cascade primary key,
  username         text unique not null,
  avatar_url       text,
  home_club_id     uuid references public.clubs(id),
  club_switched_at timestamptz,           -- tracks 30-day club switch cooldown
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);
id mirrors auth.users.id — instantiated via dynamic database trigger on core registration profiles.

username must be unique, 3–20 chars, alphanumeric + underscores only.

Enforce a strict 30-day structural cooldown when updating club_switched_at.

clubs
Static core reference parameters — all 20 Premier League clubs. Seeded once, read-only.

SQL
create table public.clubs (
  id              uuid default gen_random_uuid() primary key,
  name            text not null,           -- e.g. "Arsenal"
  short_name      text not null,           -- e.g. "ARS"
  slug            text unique not null,    -- e.g. "arsenal"
  primary_color   text not null,           -- hex e.g. "#EF0107"
  secondary_color text not null,           -- hex e.g. "#FFFFFF"
  crest_url       text not null,           -- path: /crests/{slug}.svg
  api_team_id     integer,                 -- API-Football team ID
  created_at      timestamptz default now() not null
);
locker_rooms
One structural locker room entry per club profile. Updated via automated trigger architectures.

SQL
create table public.locker_rooms (
  id              uuid default gen_random_uuid() primary key,
  club_id         uuid references public.clubs(id) on delete cascade unique not null,
  member_count    integer default 0 not null,
  created_at      timestamptz default now() not null
);
memberships
Tracks fan allocation positions. Users can only maintain one active membership assignment row.

SQL
create table public.memberships (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.users(id) on delete cascade not null,
  locker_room_id  uuid references public.locker_rooms(id) on delete cascade not null,
  fan_cred_score  integer default 0 not null,
  badge_level     text default 'fan' not null,  -- fan | regular | veteran | legend | og
  joined_at       timestamptz default now() not null,
  unique(user_id, locker_room_id)
);
posts
Unified engine storing standard inputs, raid logs, match thread texts, and global hot takes.

SQL
create table public.posts (
  id              uuid default gen_random_uuid() primary key,
  author_id       uuid references public.users(id) on delete set null,
  locker_room_id  uuid references public.locker_rooms(id) on delete cascade,
  content         text not null,
  type            text not null,           -- standard | raid | match_thread | hot_take
  match_id        uuid references public.matches(id) on delete set null,
  raid_window_id  uuid references public.raid_windows(id) on delete set null,
  match_thread_id uuid references public.match_threads(id) on delete set null,
  is_raid_post    boolean default false not null,
  upvote_count    integer default 0 not null,
  is_removed      boolean default false not null,  -- soft delete by moderator
  removed_at      timestamptz,
  removed_by      uuid references public.users(id),
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);
matches
Fixture reference layout rows synched through automated third-party developer api sync structures.

SQL
create table public.matches (
  id              uuid default gen_random_uuid() primary key,
  home_club_id    uuid references public.clubs(id) not null,
  away_club_id    uuid references public.clubs(id) not null,
  kickoff_at      timestamptz not null,
  status          text default 'scheduled' not null,  -- scheduled | live | finished | postponed
  home_score      integer,
  away_score      integer,
  winner_club_id  uuid references public.clubs(id),   -- null for draws/unfinished
  api_match_id    integer unique not null,             -- API-Football fixture ID
  api_last_synced timestamptz,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);
raid_windows
Active countdown validation entries. Linked dynamically to match results processing tasks.

SQL
create table public.raid_windows (
  id                       uuid default gen_random_uuid() primary key,
  match_id                 uuid references public.matches(id) not null,
  raiding_club_id          uuid references public.clubs(id) not null,   -- winning club
  defending_club_id        uuid references public.clubs(id) not null,   -- losing club
  raiding_locker_room_id   uuid references public.locker_rooms(id) not null,
  defending_locker_room_id uuid references public.locker_rooms(id) not null,
  opens_at                 timestamptz not null,
  closes_at                timestamptz not null,                        -- opens_at + 2 hours
  status                   text default 'active' not null,              -- active | closed
  raid_post_count          integer default 0 not null,
  created_at               timestamptz default now() not null
);
raid_eligibility
Enforces the core rule restriction parameter: strictly 1 raid entry post per fan per window profile.

SQL
create table public.raid_eligibility (
  id              uuid default gen_random_uuid() primary key,
  raid_window_id  uuid references public.raid_windows(id) on delete cascade not null,
  user_id         uuid references public.users(id) on delete cascade not null,
  has_raided      boolean default false not null,    -- true once they post in the window
  raided_at       timestamptz,
  unique(raid_window_id, user_id)
);
match_threads
SQL
create table public.match_threads (
  id              uuid default gen_random_uuid() primary key,
  match_id        uuid references public.matches(id) on delete cascade not null,
  locker_room_id  uuid references public.locker_rooms(id) on delete cascade not null,
  opens_at        timestamptz not null,    -- kickoff_at - 30 minutes
  closes_at       timestamptz not null,    -- kickoff_at + 120 minutes (approx full match + post)
  status          text default 'scheduled' not null,  -- scheduled | open | closed
  post_count      integer default 0 not null,
  created_at      timestamptz default now() not null,
  unique(match_id, locker_room_id)
);
reactions
SQL
create table public.reactions (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.users(id) on delete cascade not null,
  post_id         uuid references public.posts(id) on delete cascade not null,
  type            text not null,           -- upvote | fire | laugh | rage
  created_at      timestamptz default now() not null,
  unique(user_id, post_id, type)
);
notifications
SQL
create table public.notifications (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.users(id) on delete cascade not null,
  type            text not null,           
  title           text not null,
  body            text not null,
  reference_type  text,                    -- post | match | raid_window | membership
  reference_id    uuid,                    -- ID of the referenced entity
  is_read         boolean default false not null,
  created_at      timestamptz default now() not null
);
reports
SQL
create table public.reports (
  id              uuid default gen_random_uuid() primary key,
  reporter_id     uuid references public.users(id) on delete set null,
  post_id         uuid references public.posts(id) on delete cascade not null,
  reason          text not null,           -- hate_speech | spam | harassment | other
  details         text,
  status          text default 'pending' not null,   -- pending | reviewed | actioned | dismissed
  reviewed_by     uuid references public.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz default now() not null
);