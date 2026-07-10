---
trigger: always_on
---

# Futfi8 Realtime Subscriptions & Channel Maps

## Overview
Futfi8 uses Supabase Realtime for live UI updates — new posts appearing in locker room feeds, raid window countdowns, match thread activity, and in-app notification delivery. Realtime subscriptions are WebSocket-based and managed via the Supabase client.

The goal is to make matchday feel live — fans should see new takes appearing without refreshing the page. This is critical to the product experience.

---

## Core Subscription Principle
**Subscribe narrow, not wide.**

Never subscribe to an entire table. Always filter subscriptions by a specific `locker_room_id`, `user_id`, or `match_thread_id`. Subscribing to an entire table at scale will cause excessive payload and connection overhead.

```ts
// WRONG — subscribes to every post in the database
supabase.channel('all-posts').on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'posts',
}, handler).subscribe()

// RIGHT — subscribes only to posts in the current locker room
supabase.channel(`locker-room:${lockerRoomId}`).on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'posts',
  filter: `locker_room_id=eq.${lockerRoomId}`,
}, handler).subscribe()
Channel Naming ConventionAll channel names follow a consistent pattern — {resource}:{id}. Never use generic names like "feed" or "updates".Channel NamePurposelocker-room:{lockerRoomId}Posts feed for a specific locker roommatch-thread:{threadId}Posts in a specific match threadraid:{raidWindowId}Raid window status + raid postshot-takesGlobal hot take board (shared channel)notifications:{userId}In-app notifications for a userraid-incoming:{lockerRoomId}Raid window opening for a defending locker roomExplicit Subscription Code Handlers1. Locker Room Feed Channel (components/locker-room/LockerRoomFeed.tsx)TypeScriptconst channel = supabase
  .channel(`locker-room:${lockerRoomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: `locker_room_id=eq.${lockerRoomId}`,
  }, (payload) => {
    setPosts(prev => {
      if (prev.find(p => p.id === payload.new.id)) return prev
      return [payload.new as Post, ...prev]
    })
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'posts',
    filter: `locker_room_id=eq.${lockerRoomId}`,
  }, (payload) => {
    setPosts(prev => prev.map(p =>
      p.id === payload.new.id ? { ...p, ...payload.new } : p
    ))
  })
  .subscribe()
2. Match Thread Channel (components/match/MatchThreadFeed.tsx)TypeScriptconst channel = supabase
  .channel(`match-thread:${threadId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: `match_thread_id=eq.${threadId}`,
  }, (payload) => {
    setPosts(prev => {
      if (prev.find(p => p.id === payload.new.id)) return prev
      return [payload.new as Post, ...prev]
    })
  })
  .subscribe()
3. Incoming Raid Window Alert (components/locker-room/LockerRoomHeader.tsx)TypeScriptconst channel = supabase
  .channel(`raid-incoming:${lockerRoomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'raid_windows',
    filter: `defending_locker_room_id=eq.${lockerRoomId}`,
  }, (payload) => {
    const raidWindow = payload.new as RaidWindow
    setActiveRaid(raidWindow)
    setRaidMode(true)
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'raid_windows',
    filter: `defending_locker_room_id=eq.${lockerRoomId}`,
  }, (payload) => {
    const updated = payload.new as RaidWindow
    if (updated.status === 'closed') {
      setActiveRaid(null)
      setRaidMode(false)
    }
  })
  .subscribe()
4. Raider Interface Feed (components/raid/RaidInterface.tsx)TypeScriptconst channel = supabase
  .channel(`raid:${raidWindowId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: `raid_window_id=eq.${raidWindowId}`,
  }, (payload) => {
    setRaidPosts(prev => {
      if (prev.find(p => p.id === payload.new.id)) return prev
      return [payload.new as Post, ...prev]
    })
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'raid_windows',
    filter: `id=eq.${raidWindowId}`,
  }, (payload) => {
    const updated = payload.new as RaidWindow
    if (updated.status === 'closed') {
      setWindowClosed(true)
    }
  })
  .subscribe()
5. Global Hot Take Stream (components/hot-takes/HotTakeFeed.tsx)TypeScriptconst channel = supabase
  .channel('hot-takes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: `type=eq.hot_take`,
  }, (payload) => {
    setHotTakes(prev => {
      if (prev.find(p => p.id === payload.new.id)) return prev
      return [payload.new as Post, ...prev]
    })
  })
  .subscribe()
6. User Account Personal Notifications (components/notifications/NotificationBell.tsx)TypeScriptconst channel = supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    const notification = payload.new as Notification
    setUnreadCount(prev => prev + 1)
    setNotifications(prev => [notification, ...prev])
    if (['raid_incoming', 'raid_window_open'].includes(notification.type)) {
      showRaidToast(notification)
    }
  })
  .subscribe()