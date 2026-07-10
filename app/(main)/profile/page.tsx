import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase/server-component'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getHomeClubServer } from '@/lib/get-home-club-server'
import { ProfileContent } from './ProfileContent'

export default async function ProfilePage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [userResult, membershipResult] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, username, avatar_url, email')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('memberships')
      .select('fan_cred_score, badge_level')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const { homeClub } = await getHomeClubServer(user.id)

  const profile = userResult.data ?? { username: null, avatar_url: null, email: null }
  const membership = membershipResult.data

  return (
    <ProfileContent
      userId={user.id}
      email={profile.email}
      username={profile.username}
      avatarUrl={profile.avatar_url}
      homeClub={homeClub}
      fanCredScore={membership?.fan_cred_score ?? 0}
    />
  )
}
