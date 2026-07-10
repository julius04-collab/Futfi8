'use client'

import { useState, useCallback, useRef } from 'react'

import { PostFeed } from '@/components/locker-room/PostFeed'
import { RaidHistory } from '@/components/locker-room/RaidHistory'
import { MAX_POST_LENGTH } from '@/lib/constants'
import { Members } from '@/components/locker-room/Members'
import { Fixtures } from '@/components/locker-room/Fixtures'
import { UpcomingFixtures } from '@/components/locker-room/UpcomingFixtures'
import { RaidBanner } from '@/components/raid/RaidBanner'
import { RaidComposeBox } from '@/components/raid/RaidComposeBox'
import { useActiveRaid } from '@/hooks/use-active-raid'
import { useCreatePost } from '@/hooks/use-create-post'

type ClubData = {
  id: string
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
  crest_url?: string
}

type RaidingClub = {
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
}

type LockerRoomData = {
  id: string
  is_under_raid: boolean
  raided_by: string | null
  raid_expires_at: string | null
  raiding_club: RaidingClub | null
}

type LiveMatchTeam = {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

type LiveMatchData = {
  id: number
  utcDate: string
  status: string
  homeTeam: LiveMatchTeam
  awayTeam: LiveMatchTeam
  score: { fullTime: { home: number | null; away: number | null } }
}

type Props = {
  club: ClubData
  lockerRoom: LockerRoomData | null
  userId: string
  username: string | null
  avatarUrl: string | null
  homeClubId: string | null
  liveMatches: LiveMatchData[]
}

const TABS = ['Feed', 'Raid History', 'Members', 'Fixtures'] as const

export function LockerRoomClient({ club, lockerRoom, userId, username, avatarUrl, homeClubId, liveMatches }: Props) {
  const [activeTab, setActiveTab] = useState<string>('Feed')
  const [feedKey, setFeedKey] = useState(0)
  const [content, setContent] = useState('')
  const { createPost, isSubmitting } = useCreatePost()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const charsLeft = MAX_POST_LENGTH - content.length

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed || isSubmitting || charsLeft < 0) return
    const result = await createPost({
      locker_room_id: lockerRoom?.id,
      content: trimmed,
      type: 'standard',
    })
    if (result.success) setContent('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const { raid: activeRaid, loading: raidLoading } = useActiveRaid(club.id, userId)

  const handleRaidPosted = useCallback(() => {
    setFeedKey((k) => k + 1)
  }, [])

  const isRaidActive = !!activeRaid && !raidLoading
  const isHomeClub = homeClubId === club.id

  return (
    <div className="flex flex-1 w-full">
      <div className="flex-1 flex flex-col min-h-full max-w-[780px]">
        <div
          className="px-4 py-6"
          style={{
            background: `linear-gradient(135deg, ${club.primary_color}, ${club.secondary_color})`,
          }}
        >
          <div className="flex items-center gap-4">
            {club.crest_url ? (
              <img
                src={club.crest_url}
                alt={club.short_name}
                className="h-14 w-14 rounded-full object-contain shrink-0"
                style={{ background: 'rgba(0,0,0,0.2)' }}
              />
            ) : (
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
            )}
            <div>
              <h1
                className="text-2xl font-medium"
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

        {/* Room Under Raid alert — reads directly from locker_rooms denormalized state */}
        {lockerRoom?.is_under_raid && (
          <div className="animate-pulse bg-red-600/20 border-y border-red-500/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-lg">⚠️</span>
              <p className="text-red-400 font-bold text-sm uppercase tracking-wider">
                ROOM UNDER RAID BY{' '}
                <span className="text-white">
                  @{lockerRoom.raiding_club?.short_name ?? 'Unknown'}
                </span>
              </p>
            </div>
            {lockerRoom.raid_expires_at && (
              <p className="text-red-300/70 text-xs mt-1 ml-7 font-mono">
                Raid window expires at{' '}
                {new Date(lockerRoom.raid_expires_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        )}

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
            {!isHomeClub ? (
              <div className="border-b border-[#1e2230] bg-[#0c0d12]">
                <div className="p-4">
                  <div className="rounded-xl border border-[#1e2230] bg-[#12141c] p-4 text-center">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      You're viewing the{' '}
                      <span className="text-gray-300 font-semibold">{club.name}</span> Locker Room.
                      <br />
                      Only{' '}
                      <span className="text-gray-300 font-semibold">{club.short_name}</span> fans can post here.
                    </p>
                  </div>
                </div>
              </div>
            ) : isRaidActive && activeRaid.role === 'attacker' ? (
              <RaidComposeBox
                username={username ?? 'fan'}
                avatarUrl={avatarUrl ?? null}
                raidWindowId={activeRaid.id}
                defendingLockerRoomId={activeRaid.defending_room_id}
                onRaidPosted={handleRaidPosted}
              />
            ) : (
              <div className="border-b border-[#1e2230] bg-[#0c0d12]">
                <div className="p-4">
                  <div className="rounded-xl border border-[#1e2230] bg-[#12141c] p-4">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                      Posting as{' '}
                      <span className="text-white font-semibold">
                        @{username ?? 'fan'}
                      </span>
                    </p>
                    <textarea
                      ref={textareaRef}
                      placeholder={`Drop a hot take in the ${club.short_name} room...`}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      maxLength={MAX_POST_LENGTH}
                      className="w-full bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none resize-none min-h-[60px] leading-relaxed"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`font-mono text-[10px] ${charsLeft < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                        {charsLeft}
                      </span>
                      <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || isSubmitting || charsLeft < 0}
                        className="px-6 py-2 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-bold uppercase tracking-wider rounded-md transition duration-150"
                      >
                        {isSubmitting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {lockerRoom?.id && userId && (
              <PostFeed
                key={feedKey}
                lockerRoomId={lockerRoom.id}
                currentUserId={userId}
              />
            )}
          </>
        )}

        {activeTab === 'Raid History' && lockerRoom?.id && (
          <RaidHistory clubId={club.id} />
        )}

        {activeTab === 'Members' && lockerRoom?.id && (
          <Members lockerRoomId={lockerRoom.id} />
        )}

        {activeTab === 'Fixtures' && (
          <Fixtures clubId={club.id} />
        )}
      </div>

      <aside className="w-[320px] h-screen sticky top-0 hidden lg:flex flex-col gap-4 px-4 py-6 overflow-y-auto scrollbar-none z-10 flex-shrink-0 border-l border-[#1e2230]">
        <div className="bg-[#12141c] border border-[#1e2230] rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-extrabold tracking-tight text-white uppercase text-xs font-mono">Live on Matchday</h3>
            {liveMatches.length > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
          </div>
          {liveMatches.length > 0 ? (
            <div className="space-y-3 divide-y divide-zinc-900/40">
              {liveMatches.map((m) => {
                const isPaused = m.status === 'PAUSED'
                const isInPlay = m.status === 'IN_PLAY'
                return (
                  <div key={m.id} className="pt-2 flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-1 font-semibold text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-gray-600 rounded flex items-center justify-center text-[10px] text-white font-bold">{m.homeTeam.tla?.slice(0, 1) ?? '?'}</span>
                        <span>{m.homeTeam.shortName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-gray-600 rounded flex items-center justify-center text-[10px] text-white font-bold">{m.awayTeam.tla?.slice(0, 1) ?? '?'}</span>
                        <span>{m.awayTeam.shortName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 font-mono text-white">
                      <span>{m.score.fullTime.home ?? '-'}</span>
                      <span>{m.score.fullTime.away ?? '-'}</span>
                      <span className={`text-[10px] font-bold tracking-wider ${isInPlay ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                        {isPaused ? 'HT' : isInPlay ? 'LIVE' : m.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-xs text-gray-500">No matches live right now</p>
            </div>
          )}
        </div>

        <div className="bg-[#12141c] border border-[#1e2230] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 pb-2"><h3 className="text-md font-bold tracking-tight text-white">Football Trending</h3></div>
          <div className="p-4">
            <p className="text-xs text-gray-500">Trending topics will appear here once matchday action heats up.</p>
          </div>
        </div>

        <UpcomingFixtures />
      </aside>
    </div>
  )
}
