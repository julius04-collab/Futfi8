import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const { data: topPosts } = await supabaseAdmin
    .from('posts')
    .select(`
      id, content, upvote_count, created_at,
      author:users!author_id(username),
      locker_room:locker_rooms(club:clubs(name))
    `)
    .gte('created_at', weekAgo)
    .order('upvote_count', { ascending: false })
    .limit(10)

  if (!topPosts?.length) {
    return NextResponse.json({ sent: 0 })
  }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('email, username')

  const digestHtml = `
    <h1>Weekly Hot Takes Digest</h1>
    <p>Top posts from the past 7 days:</p>
    <ul>
      ${topPosts.map(p => `
        <li>
          <strong>${(p.author as any)?.[0]?.username || 'Unknown'}</strong>
          in <em>${(p.locker_room as any)?.[0]?.club?.name || 'Unknown'}</em>:
          "${p.content.substring(0, 100)}${p.content.length > 100 ? '...' : ''}"
          <br/><small>${p.upvote_count} upvotes</small>
        </li>
      `).join('')}
    </ul>
  `

  let sent = 0
  for (const user of users || []) {
    if (!user.email) continue
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your Weekly Futfi8 Digest',
        text: `Top posts this week:\n${topPosts.map((p, i) => `${i + 1}. "${p.content.substring(0, 100)}" — ${p.upvote_count} upvotes`).join('\n')}`,
        html: digestHtml,
      })
      sent++
    } catch {
      // Skip failed sends
    }
  }

  return NextResponse.json({ sent })
}
