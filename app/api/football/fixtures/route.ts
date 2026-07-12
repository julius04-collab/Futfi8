import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCompetitionMatches, CLUB_NAME_TO_FD_TEAM_ID } from '@/lib/football-api/client'

export const revalidate = 3600

async function resolveClubTeamId(clubId: string, clubName: string): Promise<number | null> {
  const { data: club } = await supabaseAdmin
    .from('clubs')
    .select('football_data_team_id')
    .eq('id', clubId)
    .single()

  if (club?.football_data_team_id) return club.football_data_team_id

  const fdTeamId = CLUB_NAME_TO_FD_TEAM_ID[clubName.toLowerCase()]
  if (fdTeamId) {
    await supabaseAdmin.from('clubs').update({ football_data_team_id: fdTeamId }).eq('id', clubId)
    return fdTeamId
  }

  return null
}

function statusDisplay(status: string): string {
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'live'
  if (status === 'FINISHED' || status === 'AWARDED') return 'finished'
  return 'scheduled'
}

export async function GET(req: NextRequest) {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    console.error('[FOOTBALL API] FOOTBALL_DATA_API_KEY is not set')
    return NextResponse.json({ fixtures: [], teamId: null })
  }

  const { searchParams } = new URL(req.url)
  const clubId = searchParams.get('club_id')

  if (!clubId) {
    return NextResponse.json({ error: 'club_id query parameter is required' }, { status: 400 })
  }

  try {
    const { data: club } = await supabaseAdmin
      .from('clubs')
      .select('id, name')
      .eq('id', clubId)
      .single()

    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const teamId = await resolveClubTeamId(clubId, club.name)
    if (!teamId) {
      return NextResponse.json({ error: 'Could not resolve football-data team ID' }, { status: 404 })
    }

    // Same data source as UpcomingFixtures widget: /competitions/PL/matches?status=SCHEDULED
    const matches = await getCompetitionMatches('SCHEDULED', undefined, undefined, 10)

    // Filter to only matches involving this club
    const clubMatches = matches.filter(
      (m) => m.homeTeam.id === teamId || m.awayTeam.id === teamId
    )

    // Build football-data team ID -> local club UUID reverse map
    const { data: clubs } = await supabaseAdmin
      .from('clubs')
      .select('id, football_data_team_id')

    const teamToClubMap = new Map<number, string>()
    if (clubs) {
      for (const c of clubs) {
        if (c.football_data_team_id) teamToClubMap.set(c.football_data_team_id, c.id)
      }
    }

    const enriched = clubMatches.map((f) => ({
      id: String(f.id),
      home_club_id: teamToClubMap.get(f.homeTeam.id) ?? clubId,
      away_club_id: teamToClubMap.get(f.awayTeam.id) ?? clubId,
      kickoff_at: f.utcDate,
      status: statusDisplay(f.status),
      home_score: f.score.fullTime.home,
      away_score: f.score.fullTime.away,
      home_club: {
        name: f.homeTeam.name,
        short_name: f.homeTeam.tla,
        primary_color: '#333',
        crest: f.homeTeam.crest,
      },
      away_club: {
        name: f.awayTeam.name,
        short_name: f.awayTeam.tla,
        primary_color: '#333',
        crest: f.awayTeam.crest,
      },
    }))

    return NextResponse.json({ fixtures: enriched, teamId })
  } catch (err) {
    console.error('[FOOTBALL FIXTURES] Error:', err)
    return NextResponse.json({ fixtures: [], teamId: null })
  }
}
