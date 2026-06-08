'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingBar } from '@/components/ui/LoadingBar'
import { Trophy, Shield } from 'lucide-react'

type MemberItem = {
  user_id: string
  fan_cred_score: number
  badge_level: string
  joined_at: string
  user: { id: string; username: string; avatar_url: string | null }
}

type MembersProps = {
  lockerRoomId: string
}

export function Members({ lockerRoomId }: MembersProps) {
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('memberships')
      .select(`
        user_id, fan_cred_score, badge_level, joined_at,
        user:users!user_id(id, username, avatar_url)
      `)
      .eq('locker_room_id', lockerRoomId)
      .order('fan_cred_score', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) setMembers(data as unknown as MemberItem[])
        setLoading(false)
      })
  }, [lockerRoomId])

  if (loading) return <div className="flex justify-center py-12"><LoadingBar /></div>

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Trophy className="mb-3 h-10 w-10" style={{ color: 'var(--futfi8-color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--futfi8-color-text-muted)' }}>No members yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {members.map((member, index) => (
        <div
          key={member.user_id}
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--futfi8-color-border-subtle)' }}
        >
          <span
            className="w-5 text-center text-xs font-bold shrink-0"
            style={{ color: index < 3 ? 'var(--futfi8-color-text-accent)' : 'var(--futfi8-color-text-muted)' }}
          >
            {index + 1}
          </span>
          <Avatar src={member.user?.avatar_url} name={member.user?.username || '?'} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--futfi8-color-text-primary)' }}>
              {member.user?.username || 'Unknown'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {member.badge_level && <Badge variant="default">{member.badge_level}</Badge>}
            <div className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" style={{ color: 'var(--futfi8-color-text-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--futfi8-color-text-primary)' }}>
                {member.fan_cred_score}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
