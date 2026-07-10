---
trigger: always_on
---

# Futfi8 Security Policies, Procedures, & Real-Time Engine Setup

## Row Level Security (RLS) Policies

RLS parameters are actively bound across every transactional relation layer.

### `users` Setup
```sql
create policy "Public profiles are viewable by everyone"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);
```

### `posts` Setup
```sql
create policy "Posts are publicly readable"
  on public.posts for select using (is_removed = false);

create policy "Authenticated users can insert posts"
  on public.posts for insert with check (auth.uid() = author_id);

create policy "Users can remove own posts"
  on public.posts for update using (auth.uid() = author_id);
```

### `reactions` Setup
```sql
create policy "Reactions are publicly readable"
  on public.reactions for select using (true);

create policy "Users can manage own reactions"
  on public.reactions for all using (auth.uid() = user_id);
```

### `notifications` & `raid_windows` Setup
```sql
create policy "Users see own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Raid windows are publicly readable"
  on public.raid_windows for select using (true);
```

Write privileges restricted exclusively to the background service layer keys.

---

## DB Automation Functions & Triggers

### Timestamp Maintenance Automation
```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

### Member Tracking Denormalization Synchronizer
```sql
create or replace function sync_member_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.locker_rooms
    set member_count = member_count + 1
    where id = NEW.locker_room_id;
  elsif TG_OP = 'DELETE' then
    update public.locker_rooms
    set member_count = member_count - 1
    where id = OLD.locker_room_id;
  end if;
  return null;
end;
$$ language plpgsql;
```

### Upvote Metric Counter
```sql
create or replace function sync_upvote_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.type = 'upvote' then
    update public.posts set upvote_count = upvote_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' and OLD.type = 'upvote' then
    update public.posts set upvote_count = upvote_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql;
```

---

## Index Optimizer Schemas

### Posts query vectors
```sql
create index idx_posts_locker_room_created on public.posts(locker_room_id, created_at desc);
create index idx_posts_match_thread on public.posts(match_thread_id, created_at desc);
create index idx_posts_raid_window on public.posts(raid_window_id, created_at desc);
create index idx_posts_hot_takes on public.posts(type, created_at desc) where type = 'hot_take';
create index idx_posts_author on public.posts(author_id, created_at desc);
```

### Matches timelines
```sql
create index idx_matches_kickoff on public.matches(kickoff_at);
create index idx_matches_status on public.matches(status);
create index idx_matches_clubs on public.matches(home_club_id, away_club_id);
```

### Raid parameters tracking lookup performance vectors
```sql
create index idx_raid_windows_status on public.raid_windows(status, closes_at);
create index idx_raid_windows_defending on public.raid_windows(defending_locker_room_id, status);
```

### Memberships, notifications, and reactions keys
```sql
create index idx_memberships_user on public.memberships(user_id);
create index idx_memberships_locker_room on public.memberships(locker_room_id, fan_cred_score desc);
create index idx_notifications_user_unread on public.notifications(user_id, is_read, created_at desc);
create index idx_reactions_post on public.reactions(post_id, type);
```

---

## Supabase Real-Time Subscriptions Matrix

Explicit tables configured with logical real-time streaming filters inside the cloud management frame.

| Table Target | Tracking Event Type | Real-Time Filter Syntax |
|---|---|---|
| `posts` | INSERT | `locker_room_id = eq.{id}` |
| `posts` | UPDATE | `locker_room_id = eq.{id}` |
| `raid_windows` | INSERT | `defending_locker_room_id = eq.{id}` |
| `raid_windows` | UPDATE | `status = eq.active` |
| `match_threads` | UPDATE | `locker_room_id = eq.{id}` |
| `notifications` | INSERT | `user_id = eq.{userId}` |

---

## Core Seed Protocol Setup

The local production seed config code script lives at path: `supabase/seed.sql`.

Initial execution states must explicitly complete the following actions:
- Seed the metadata matching the 20 active Premier League clubs alongside slugs, themes, and valid API map markers.
- Initialize 20 matching individual rows within `public.locker_rooms`.
- Keep user tables clear during seed steps to avoid auth collision issues.
