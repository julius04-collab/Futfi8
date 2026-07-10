import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

type RawPost = Record<string, unknown>

function extractAuthor(p: RawPost): string | null {
  const author = p.author
  if (Array.isArray(author)) return (author[0] as { username?: string } | undefined)?.username ?? null
  if (author && typeof author === 'object') return (author as { username?: string }).username ?? null
  return null
}

function extractClubName(p: RawPost): string | null {
  const lr = p.locker_room
  const club = Array.isArray(lr) ? (lr[0] as { club?: unknown } | undefined)?.club : (lr as { club?: unknown } | undefined)?.club
  if (Array.isArray(club)) return (club[0] as { name?: string } | undefined)?.name ?? null
  if (club && typeof club === 'object') return (club as { name?: string }).name ?? null
  return null
}

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
      ${topPosts.map((p: RawPost) => {
        const authorName = extractAuthor(p) ?? 'Unknown'
        const clubName = extractClubName(p) ?? 'Unknown'
        const content = (p.content as string) ?? ''
        const upvotes = (p.upvote_count as number) ?? 0
        return `
        <li>
          <strong>${authorName}</strong>
          in <em>${clubName}</em>:
          "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"
          <br/><small>${upvotes} upvotes</small>
        </li>`
      }).join('')}
    </ul>
  `

  let sent = 0
  for (const user of users || []) {
    if (!user.email) continue
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your Weekly Futfi8 Digest',
        text: `Top posts this week:\n${topPosts.map((p: RawPost, i: number) => `${i + 1}. "${(p.content as string)?.substring(0, 100) ?? ''}" — ${(p.upvote_count as number) ?? 0} upvotes`).join('\n')}`,
        html: digestHtml,
      })
      sent++
    } catch {
      // Skip failed sends
    }
  }

  return NextResponse.json({ sent })
}
