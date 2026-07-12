import { NextResponse } from 'next/server'
import { getCompetitionMatches } from '@/lib/football-api/client'

export const revalidate = 3600

export async function GET() {
  try {
    const matches = await getCompetitionMatches('SCHEDULED', undefined, undefined, 3)
    return NextResponse.json({ matches })
  } catch (err) {
    console.error('[UPCOMING FIXTURES] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch upcoming fixtures' }, { status: 500 })
  }
}
