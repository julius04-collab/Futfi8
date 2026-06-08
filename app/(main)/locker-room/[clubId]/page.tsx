'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { PostFeed } from '@/components/locker-room/PostFeed'
import { ComposeBox } from '@/components/locker-room/ComposeBox'
import { RaidHistory } from '@/components/locker-room/RaidHistory'
import { Members } from '@/components/locker-room/Members'
import { Fixtures } from '@/components/locker-room/Fixtures'
import { RaidBanner } from '@/components/raid/RaidBanner'
import { RaidComposeBox } from '@/components/raid/RaidComposeBox'
import { useActiveRaid } from '@/hooks/useActiveRaid'
import { LoadingBar } from '@/components/ui/LoadingBar'

type ClubData = {
  id: string
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
}

type UserProfile = {
  id: string
  username: string
  avatar_url: string | null
  home_club_id: string | null
}

const TABS = ['Feed', 'Raid History', 'Members', 'Fixtures'] as const

export default function LockerRoomPage() {
  const params = useParams()
  const router = useRouter()
  const clubId = params.clubId as string
  const [club, setClub] = useState<ClubData | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [lockerRoomId, setLockerRoomId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('Feed')
  const [feedKey, setFeedKey] = useState(0)

  const { raid: activeRaid, loading: raidLoading } = useActiveRaid(clubId, profile?.id ?? null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }

      Promise.all([
        supabase
          .from('clubs')
          .select('id, name, short_name, primary_color, secondary_color')
          .eq('id', clubId)
          .single(),
        supabase
          .from('users')
          .select('id, username, avatar_url, home_club_id')
          .eq('id', user.id)
          .single(),
        supabase
          .from('locker_rooms')
          .select('id')
          .eq('club_id', clubId)
          .single(),
      ]).then(([clubRes, profileRes, roomRes]) => {
        if (clubRes.error || !clubRes.data) {
          router.push('/hot-takes')
          return
        }
        setClub(clubRes.data)
        setProfile(profileRes.data)
        if (roomRes.data) setLockerRoomId(roomRes.data.id)
      }).finally(() => setLoading(false))
    })
  }, [clubId, router])

  const handlePost = useCallback(async (content: string) => {
    if (!lockerRoomId) return
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locker_room_id: lockerRoomId,
        content,
        type: 'standard',
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error)
    }
  }, [lockerRoomId])

  const handleRaidPosted = useCallback(() => {
    setFeedKey((k) => k + 1)
  }, [])

  const isRaidActive = !!activeRaid && !raidLoading

  if (loading || !club) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <LoadingBar />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="px-4 py-6"
        style={{
          background: `linear-gradient(135deg, ${club.primary_color}, ${club.secondary_color})`,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold shrink-0"
            style={{
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontFamily: 'var(--futfi8-typography-font-family-display)',
            }}
          >
            {club.short_name}
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{
                fontFamily: 'var(--futfi8-typography-font-family-display)',
                color: '#fff',
              }}
            >
              {club.name}
            </h1>
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Locker Room
            </p>
          </div>
        </div>
      </div>

      {isRaidActive && (
        <RaidBanner
          raidingClub={activeRaid.raiding_club}
          defendingClub={activeRaid.defending_club}
          matchScore={{ home: activeRaid.match.home_score, away: activeRaid.match.away_score }}
          closesAt={activeRaid.closes_at}
        />
      )}

      <div
        className="flex border-b"
        style={{ borderColor: 'var(--futfi8-color-border-default)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--futfi8-color-border-accent)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab
                ? 'var(--futfi8-color-text-accent)'
                : 'var(--futfi8-color-text-muted)',
              fontSize: '12px',
              fontWeight: activeTab === tab ? 600 : 400,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Feed' && (
        <>
          {profile && lockerRoomId && isRaidActive && activeRaid.role === 'attacker' && (
            <RaidComposeBox
              username={profile.username}
              avatarUrl={profile.avatar_url}
              raidWindowId={activeRaid.id}
              defendingLockerRoomId={activeRaid.defending_room_id}
              onRaidPosted={handleRaidPosted}
            />
          )}
          {profile && lockerRoomId && !(isRaidActive && activeRaid.role === 'attacker') && (
            <ComposeBox
              username={profile.username}
              avatarUrl={profile.avatar_url}
              onPost={handlePost}
            />
          )}
          {lockerRoomId && profile && (
            <PostFeed
              key={feedKey}
              lockerRoomId={lockerRoomId}
              currentUserId={profile.id}
            />
          )}
        </>
      )}

      {activeTab === 'Raid History' && lockerRoomId && (
        <RaidHistory clubId={clubId} />
      )}

      {activeTab === 'Members' && lockerRoomId && (
        <Members lockerRoomId={lockerRoomId} />
      )}

      {activeTab === 'Fixtures' && (
        <Fixtures clubId={clubId} />
      )}
    </div>
  )
}
