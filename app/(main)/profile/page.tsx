'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { User, LogOut, Shield, ArrowLeftRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingBar } from '@/components/ui/LoadingBar'

type ProfileData = {
  id: string
  username: string
  email: string
  avatar_url: string | null
  home_club_id: string | null
  created_at: string
}

type MembershipData = {
  fan_cred_score: number
  badge_level: string
  locker_room: { club: { name: string; short_name: string; crest_url: string; primary_color: string } } | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [membership, setMembership] = useState<MembershipData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      supabase.from('users').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setProfile(data as ProfileData)
      })

      supabase
        .from('memberships')
        .select(`
          fan_cred_score, badge_level,
          locker_room:locker_rooms!locker_room_id(club:clubs!club_id(name, short_name, crest_url, primary_color))
        `)
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setMembership(data as unknown as MembershipData)
          setLoading(false)
        })
    })
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingBar /></div>
  }

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-3 border-b px-4 py-5"
        style={{
          borderColor: 'var(--futfi8-color-border-default)',
          background: membership?.locker_room?.club?.primary_color
            ? `linear-gradient(135deg, ${membership.locker_room.club.primary_color}, #0D0D0F)`
            : 'var(--futfi8-color-background-surface)',
        }}
      >
        <Avatar src={profile?.avatar_url} name={profile?.username || '?'} size={52} />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ color: '#fff', fontFamily: 'var(--futfi8-typography-font-family-display)' }}>
            {profile?.username || 'Unknown'}
          </h1>
          {membership?.locker_room?.club && (
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {membership.locker_room.club.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--futfi8-color-text-muted)' }}>
                Fan Cred Score
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--futfi8-color-text-primary)', fontFamily: 'var(--futfi8-typography-font-family-display)' }}>
                {membership?.fan_cred_score ?? 0}
              </p>
            </div>
            <Shield className="h-8 w-8" style={{ color: 'var(--futfi8-color-text-accent)' }} />
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--futfi8-color-text-secondary)' }}>
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{profile?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--futfi8-color-text-secondary)' }}>
              <ArrowLeftRight className="h-4 w-4 shrink-0" />
              <span>
                {membership?.locker_room?.club?.short_name
                  ? `Home: ${membership.locker_room.club.short_name}`
                  : 'No home club'}
              </span>
            </div>
          </div>
        </Card>

        <Button variant="ghost" className="w-full justify-center" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
