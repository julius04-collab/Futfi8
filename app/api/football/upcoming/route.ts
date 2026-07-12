import { NextResponse } from 'next/server'
import { getCompetitionMatches } from '@/lib/football-api/client'

export const revalidate = 3600

export async function GET() {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    console.error('[FOOTBALL API] FOOTBALL_DATA_API_KEY is not set')
    return NextResponse.json({ matches: [] })
  }

  try {
    const matches = await getCompetitionMatches('SCHEDULED', undefined, undefined, 3)
    return NextResponse.json({ matches })
  } catch (err) {
    console.error('[UPCOMING FIXTURES] Error:', err)
    return NextResponse.json({ matches: [] })
  }
}
