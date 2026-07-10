import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase/server-component'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getLiveMatchesWidget } from '@/lib/football-api/client'
import { HotTakesClient } from './HotTakesClient'

export default async function HotTakesPage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [userResult, clubsResult, postsResult] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, username, avatar_url, home_club_id')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('clubs')
      .select('id, short_name, name, primary_color, secondary_color, crest_url'),
    supabaseAdmin
      .from('posts')
      .select(`
        id, created_at, content, author_id,
        author:users!author_id(id, username, avatar_url, home_club_id)
      `)
      .eq('type', 'hot_take')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const profile = userResult.data ?? { username: null, avatar_url: null, home_club_id: null }
  const clubs = clubsResult.data ?? []
  const rawPosts = postsResult.data ?? []
  const liveMatches = await getLiveMatchesWidget()
  const posts: Array<{
    id: string
    created_at: string
    content: string
    author_id: string
    author: {
      id: string
      username: string
      avatar_url: string | null
      home_club_id: string | null
    } | null
  }> = rawPosts.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    created_at: p.created_at as string,
    content: p.content as string,
    author_id: p.author_id as string,
    author: Array.isArray(p.author)
      ? (p.author[0] as { id: string; username: string; avatar_url: string | null; home_club_id: string | null } | undefined) ?? null
      : (p.author as { id: string; username: string; avatar_url: string | null; home_club_id: string | null } | null),
  }))

  return (
    <HotTakesClient
      initialClubs={clubs as Array<{ id: string; short_name: string; name: string; primary_color: string; secondary_color: string; crest_url?: string }>}
      initialPosts={posts}
      userId={user.id}
      username={profile.username}
      avatarUrl={profile.avatar_url}
      liveMatches={liveMatches}
    />
  )
}
