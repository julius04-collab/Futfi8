---
trigger: always_on
---

# Futfi8 Server-Side Notification Management Logic

## Origin Code Triggers
Alert records must be appended through server actions exclusively — client-side injection parameters are banned.

- **Raid Modulations (`open / incoming / closing / closed`):** Executed directly from `app/api/cron/close-raid-windows/route.ts`.
- **Match Intersections (`match_thread_open`):** Managed inside `app/api/cron/open-match-threads/route.ts`.
- **Social Reaction Mutations (`post_upvoted`):** Fired upon database verification hooks inside `app/api/reactions/route.ts`.
- **Conversation Extensions (`post_replied`):** Instantiated directly in `app/api/posts/route.ts`.
- **Cron Re-calibrations (`fan_cred_milestone`):** Handled via `app/api/cron/recalculate-cred/route.ts`.
- **Global Bulletins (`weekly_digest`):** Controlled via `app/api/cron/weekly-digest/route.ts`.
- **Account Adjustments (`club_switch_confirmed`):** Triggered from `app/api/users/me/club/route.ts`.

---

## Core Notification Orchestrator

```ts
// lib/notifications/create-notification.ts
import { createSupabaseServiceClient } from '@/lib/supabase/server'

interface NotificationPayload {
  userId: string
  type: string
  title: string
  body: string
  referenceType?: 'post' | 'match' | 'raid_window' | 'membership'
  referenceId?: string
}

export async function createNotification(payload: NotificationPayload) {
  const supabase = createSupabaseServiceClient()

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select(payload.type)
    .eq('user_id', payload.userId)
    .single()

  if (prefs && prefs[payload.type] === false) return

  await enforceNotificationCap(payload.userId)

  await supabase.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    reference_type: payload.referenceType,
    reference_id: payload.referenceId,
  })
}

export async function createBulkNotifications(payloads: NotificationPayload[]) {
  const supabase = createSupabaseServiceClient()
  const userIds = [...new Set(payloads.map(p => p.userId))]
  
  const { data: allPrefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .in('user_id', userIds)

  const filtered = payloads.filter(p => {
    const prefs = allPrefs?.find(pref => pref.user_id === p.userId)
    return !prefs || prefs[p.type] !== false
  })

  if (filtered.length === 0) return

  await supabase.from('notifications').insert(filtered.map(p => ({
    user_id: p.userId,
    type: p.type,
    title: p.title,
    body: p.body,
    reference_type: p.referenceType,
    reference_id: p.referenceId,
  })))
}
High-Volume Matchday Bulk Fan Routing
When a live game registers as finished, fetch current locker room memberships and dispatch updates to targets via clean arrays parsing.

TypeScript
// Executed as parts of match final result validation hooks
async function notifyRaidOpened(raidWindow: any) {
  const { data: raiders } = await supabase.from('memberships').select('user_id').eq('locker_room_id', raidWindow.raiding_locker_room_id)
  const { data: defenders } = await supabase.from('memberships').select('user_id').eq('locker_room_id', raidWindow.defending_locker_room_id)

  if (raiders) {
    await createBulkNotifications(raiders.map(r => ({
      userId: r.user_id,
      type: 'raid_window_open',
      title: 'Get in there. ⚔️',
      body: `${raidWindow.defending_club_name}'s locker room is open. You've got 2 hours.`,
      referenceType: 'raid_window',
      referenceId: raidWindow.id,
    })))
  }

  if (defenders) {
    await createBulkNotifications(defenders.map(d => ({
      userId: d.user_id,
      type: 'raid_incoming',
      title: 'Incoming raid. 🚨',
      body: `${raidWindow.raiding_club_name} fans are coming. Defend your locker room.`,
      referenceType: 'raid_window',
      referenceId: raidWindow.id,
    })))
  }
}
Transactional Email Engine via Nodemailer
High-priority pipelines bypass local app bounds to strike immediate user email targets directly using a standardized SMTP transporter configuration.

Design elements are constrained to minimalist styles matching #0D0D0F backgrounds with #9B6EFF button parameters, using web-safe font fallbacks.

TypeScript
// lib/nodemailer/send-email.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface RaidEmailPayload {
  to: string
  type: 'raid_window_open' | 'raid_incoming'
  clubName: string
  raidWindowId: string
}

export async function sendRaidEmail({ to, type, clubName, raidWindowId }: RaidEmailPayload) {
  const isRaider = type === 'raid_window_open'
  const subject = isRaider 
    ? `Get in there — ${clubName}'s locker room is open ⚔️` 
    : `Incoming raid — ${clubName} fans are coming 🚨`

  const htmlContent = `
    <div style="background-color: #0D0D0F; color: #FFFFFF; font-family: sans-serif; padding: 32px; text-align: center; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #FFFFFF; font-size: 24px; margin-bottom: 16px;">${isRaider ? 'WE BREACHED THEM!' : 'WE ARE UNDER ATTACK!'}</h1>
      <p style="color: #CCCCCC; font-size: 16px; margin-bottom: 32px;">
        ${isRaider ? `${clubName}'s locker room is completely exposed. You have exactly 2 hours to drop your takes.` : `${clubName} fans have breached your perimeter. Get to your locker room and defend your turf.`}
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/locker-room?raid=${raidWindowId}" 
         style="background-color: #9B6EFF; color: #FFFFFF; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
         ${isRaider ? 'EXECUTE RAID ⚔️' : 'DEFEND LOCKER ROOM 🚨'}
      </a>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `"Futfi8" <${process.env.SMTP_FROM_EMAIL || 'noreply@futfi8.com'}>`,
      to,
      subject,
      html: htmlContent,
    })
  } catch (error) {
    console.error('[Nodemailer Raid Email Error]', error)
  }
}

export async function sendWeeklyDigest({ to, clubName, topPosts, upcomingFixtures }: any) {
  try {
    await transporter.sendMail({
      from: `"Futfi8" <${process.env.SMTP_FROM_EMAIL || 'noreply@futfi8.com'}>`,
      to,
      subject: `This week in your locker room — ${clubName}`,
      html: `<!-- Minimalist layout loops topPosts & upcomingFixtures inside #0D0D0F container -->`,
    })
  } catch (error) {
    console.error('[Nodemailer Digest Email Error]', error)
  }
}
Structural Capping Performance Limits
To secure storage scaling thresholds, clamp maximum user table bounds to a limit of 100 unread entries. Run validation slices cleanly before processing inputs.

TypeScript
async function enforceNotificationCap(userId: string) {
  const supabase = createSupabaseServiceClient()
  
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (count && count >= 100) {
    const { data: oldest } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (oldest) {
      await supabase.from('notifications').delete().eq('id', oldest.id)
    }
  }
}