'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LoadingBar } from '@/components/ui/LoadingBar'
import { Bell, ArrowUp, Flame, Swords } from 'lucide-react'

type NotificationItem = {
  id: string
  type: string
  reference_id: string
  read: boolean
  created_at: string
}

const iconMap: Record<string, React.ReactNode> = {
  upvote: <ArrowUp className="h-4 w-4" />,
  raid_opened: <Swords className="h-4 w-4" />,
  defence_reply: <Flame className="h-4 w-4" />,
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function getLabel(type: string): string {
  switch (type) {
    case 'upvote': return 'Someone upvoted your post'
    case 'raid_opened': return 'A raid window has opened'
    case 'defence_reply': return 'Someone replied to a raid post'
    default: return type.replace(/_/g, ' ')
  }
}

export function NotificationsFeed() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      supabase
        .from('notifications')
        .select('id, type, reference_id, read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (!error && data) {
            setNotifications(data)
          }
          setLoading(false)
        })

      // Mark all as read
      supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
    })
  }, [router])

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingBar /></div>
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Bell className="mb-3 h-10 w-10" style={{ color: 'var(--futfi8-color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--futfi8-color-text-muted)' }}>No notifications yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-center gap-3 px-4 py-3 transition-colors"
          style={{
            background: n.read ? 'transparent' : 'rgba(155,110,255,0.05)',
            borderBottom: '1px solid var(--futfi8-color-border-subtle)',
          }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
            style={{
              background: n.read
                ? 'var(--futfi8-color-background-input)'
                : 'rgba(155,110,255,0.15)',
              color: n.read
                ? 'var(--futfi8-color-text-muted)'
                : 'var(--futfi8-color-text-accent)',
            }}
          >
            {iconMap[n.type] || <Bell className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate" style={{ color: 'var(--futfi8-color-text-secondary)' }}>
              {getLabel(n.type)}
            </p>
          </div>
          <span className="text-[11px] shrink-0" style={{ color: 'var(--futfi8-color-text-muted)' }}>
            {formatTime(n.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
