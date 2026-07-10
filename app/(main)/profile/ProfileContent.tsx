'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { User, LogOut, Shield, ArrowLeftRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { HomeClubServer } from '@/lib/get-home-club-server'

type Props = {
  userId: string
  email: string | null
  username: string | null
  avatarUrl: string | null
  homeClub: HomeClubServer | null
  fanCredScore: number
}

export function ProfileContent({ userId, email, username, avatarUrl, homeClub, fanCredScore }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex-1 flex flex-col w-full">
      <div
        className="flex items-center gap-3 border-b px-4 py-5"
        style={{
          borderColor: 'var(--futfi8-color-border-default)',
          background: homeClub?.primary_color
            ? `linear-gradient(135deg, ${homeClub.primary_color}, #0D0D0F)`
            : 'var(--futfi8-color-background-surface)',
        }}
      >
        <Avatar src={avatarUrl} name={username || '?'} size={52} />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-medium truncate" style={{ color: '#fff', fontFamily: 'var(--futfi8-typography-font-family-display)' }}>
            {username || 'Unknown'}
          </h1>
          {homeClub && (
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {homeClub.name}
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
                {fanCredScore}
              </p>
            </div>
            <Shield className="h-8 w-8" style={{ color: 'var(--futfi8-color-text-accent)' }} />
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--futfi8-color-text-secondary)' }}>
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--futfi8-color-text-secondary)' }}>
              <ArrowLeftRight className="h-4 w-4 shrink-0" />
              <span>
                {homeClub?.short_name
                  ? `Home: ${homeClub.short_name}`
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
