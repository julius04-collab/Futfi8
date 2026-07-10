import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase/server-component'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getHomeClubServer } from '@/lib/get-home-club-server'

export default async function LockerRoomRedirectPage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { homeClub } = await getHomeClubServer(user.id)

  if (homeClub?.id) {
    redirect(`/locker-room/${homeClub.id}`)
  }

  const { data } = await supabaseAdmin
    .from('clubs')
    .select('id')
    .eq('short_name', 'MUN')
    .maybeSingle()

  if (data?.id) {
    redirect(`/locker-room/${data.id}`)
  }

  redirect('/hot-takes')
}
