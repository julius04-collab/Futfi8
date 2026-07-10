'use client'

import { Bell } from 'lucide-react'
import { NotificationsFeed } from '@/components/notifications/NotificationsFeed'

export default function NotificationsPage() {
  return (
    <div className="flex-1 flex flex-col w-full">
      <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: '1px solid var(--futfi8-color-border-default)' }}>
        <Bell className="h-5 w-5" style={{ color: 'var(--futfi8-color-text-accent)' }} />
        <h1
          className="text-lg font-medium"
          style={{
            fontFamily: 'var(--futfi8-typography-font-family-display)',
            color: 'var(--futfi8-color-text-primary)',
          }}
        >
          Notifications
        </h1>
      </div>
      <NotificationsFeed />
    </div>
  )
}
