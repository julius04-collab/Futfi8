/**
 * Seed script for Futfi8 — 20 Premier League clubs (2026/27 season)
 *
 * Usage:
 *   npx tsx supabase/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * If FOOTBALL_API_KEY is set, verifies/updates API-Football IDs automatically.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const footballApiKey = process.env.FOOTBALL_API_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

type ClubSeed = {
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
  api_football_team_id: number
  crest_url: string
}

const CLUBS: ClubSeed[] = [
  { name: 'Arsenal',             short_name: 'ARS', primary_color: '#EF0107', secondary_color: '#063672', api_football_team_id: 42,  crest_url: '/images/crests/arsenal.png' },
  { name: 'Aston Villa',         short_name: 'AVL', primary_color: '#670E36', secondary_color: '#95BFE5', api_football_team_id: 66,  crest_url: '/images/crests/aston-villa.png' },
  { name: 'Bournemouth',         short_name: 'BOU', primary_color: '#DA291C', secondary_color: '#000000', api_football_team_id: 35,  crest_url: '/images/crests/bournemouth.png' },
  { name: 'Brentford',           short_name: 'BRE', primary_color: '#E30613', secondary_color: '#FBB800', api_football_team_id: 55,  crest_url: '/images/crests/brentford.png' },
  { name: 'Brighton',            short_name: 'BHA', primary_color: '#0057B8', secondary_color: '#FFCD00', api_football_team_id: 51,  crest_url: '/images/crests/brighton.png' },
  { name: 'Chelsea',             short_name: 'CHE', primary_color: '#034694', secondary_color: '#DBA111', api_football_team_id: 49,  crest_url: '/images/crests/chelsea.png' },
  { name: 'Coventry City',       short_name: 'COV', primary_color: '#5EB6E4', secondary_color: '#FFFFFF', api_football_team_id: 571, crest_url: '/images/crests/coventry-city.png' },
  { name: 'Crystal Palace',      short_name: 'CRY', primary_color: '#1B458F', secondary_color: '#C4122E', api_football_team_id: 52,  crest_url: '/images/crests/crystal-palace.png' },
  { name: 'Everton',             short_name: 'EVE', primary_color: '#003399', secondary_color: '#FFFFFF', api_football_team_id: 45,  crest_url: '/images/crests/everton.png' },
  { name: 'Fulham',              short_name: 'FUL', primary_color: '#000000', secondary_color: '#CC0000', api_football_team_id: 36,  crest_url: '/images/crests/fulham.png' },
  { name: 'Hull City',           short_name: 'HUL', primary_color: '#F5A623', secondary_color: '#000000', api_football_team_id: 64,  crest_url: '/images/crests/hull-city.png' },
  { name: 'Ipswich Town',        short_name: 'IPS', primary_color: '#0044AA', secondary_color: '#FFFFFF', api_football_team_id: 57,  crest_url: '/images/crests/ipswich-town.png' },
  { name: 'Leeds United',        short_name: 'LEE', primary_color: '#FFCD00', secondary_color: '#1D428A', api_football_team_id: 63,  crest_url: '/images/crests/leeds-united.png' },
  { name: 'Liverpool',           short_name: 'LIV', primary_color: '#C8102E', secondary_color: '#00B2A9', api_football_team_id: 40,  crest_url: '/images/crests/liverpool.png' },
  { name: 'Manchester City',     short_name: 'MCI', primary_color: '#6CABDD', secondary_color: '#1C2C5B', api_football_team_id: 50,  crest_url: '/images/crests/manchester-city.png' },
  { name: 'Manchester United',   short_name: 'MUN', primary_color: '#DA291C', secondary_color: '#FBE122', api_football_team_id: 33,  crest_url: '/images/crests/manchester-united.png' },
  { name: 'Newcastle United',    short_name: 'NEW', primary_color: '#241F20', secondary_color: '#FFFFFF', api_football_team_id: 34,  crest_url: '/images/crests/newcastle-united.png' },
  { name: 'Nottingham Forest',   short_name: 'NFO', primary_color: '#DD0000', secondary_color: '#FFFFFF', api_football_team_id: 65,  crest_url: '/images/crests/nottingham-forest.png' },
  { name: 'Sunderland',          short_name: 'SUN', primary_color: '#EB172B', secondary_color: '#000000', api_football_team_id: 74,  crest_url: '/images/crests/sunderland.png' },
  { name: 'Tottenham Hotspur',   short_name: 'TOT', primary_color: '#132257', secondary_color: '#FFFFFF', api_football_team_id: 47,  crest_url: '/images/crests/tottenham-hotspur.png' },
]

/**
 * Query API-Football /teams endpoint to verify and update team IDs.
 * Falls back to default IDs if the API key is missing or the request fails.
 */
async function verifyApiFootballIds(clubs: ClubSeed[]): Promise<ClubSeed[]> {
  if (!footballApiKey) {
    console.log('⚠ FOOTBALL_API_KEY not set — using default API-Football IDs.')
    return clubs
  }

  console.log('🔄 Verifying API-Football team IDs via /teams endpoint...')

  try {
    const response = await fetch(
      'https://v3.football.api-sports.io/teams?league=39&season=2026',
      {
        headers: {
          'x-rapidapi-key': footballApiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
      }
    )

    if (!response.ok) {
      console.warn(`⚠ API-Football returned ${response.status} — using default IDs.`)
      return clubs
    }

    const data = await response.json()

    if (!data?.response?.length) {
      console.warn('⚠ No teams returned from API-Football — using default IDs.')
      return clubs
    }

    const apiTeams: { team: { id: number; name: string } }[] = data.response
    const nameToId = new Map<string, number>()

    for (const entry of apiTeams) {
      nameToId.set(entry.team.name.toLowerCase(), entry.team.id)
    }

    let updatedCount = 0
    const updatedClubs = clubs.map((club) => {
      const apiId = nameToId.get(club.name.toLowerCase())
      if (apiId && apiId !== club.api_football_team_id) {
        console.log(`  ✏ Updated ${club.name}: ${club.api_football_team_id} → ${apiId}`)
        updatedCount++
        return { ...club, api_football_team_id: apiId }
      }
      return club
    })

    console.log(`✅ Verified ${clubs.length} clubs. ${updatedCount} IDs updated.`)
    return updatedClubs
  } catch (err) {
    console.warn('⚠ Failed to reach API-Football — using default IDs.', err)
    return clubs
  }
}

async function seed() {
  console.log('🌱 Starting Futfi8 database seed...\n')

  // Step 1: Verify API-Football IDs
  const verifiedClubs = await verifyApiFootballIds(CLUBS)

  // Step 2: Upsert clubs
  console.log('\n📦 Seeding clubs...')
  const { data: insertedClubs, error: clubError } = await supabase
    .from('clubs')
    .upsert(
      verifiedClubs.map((club) => ({
        name: club.name,
        short_name: club.short_name,
        primary_color: club.primary_color,
        secondary_color: club.secondary_color,
        api_football_team_id: club.api_football_team_id,
        crest_url: club.crest_url,
      })),
      { onConflict: 'name' }
    )
    .select()

  if (clubError) {
    console.error('❌ Failed to seed clubs:', clubError.message)
    process.exit(1)
  }

  console.log(`  ✅ ${insertedClubs.length} clubs seeded.`)

  // Step 3: Create locker rooms (one per club)
  console.log('\n🏟  Creating locker rooms...')
  const lockerRoomData = insertedClubs.map((club) => ({
    club_id: club.id,
    member_count: 0,
  }))

  const { data: insertedRooms, error: roomError } = await supabase
    .from('locker_rooms')
    .upsert(lockerRoomData, { onConflict: 'club_id' })
    .select()

  if (roomError) {
    console.error('❌ Failed to create locker rooms:', roomError.message)
    process.exit(1)
  }

  console.log(`  ✅ ${insertedRooms.length} locker rooms created.`)

  // Summary
  console.log('\n🎉 Seed complete!')
  console.log('   Clubs:', insertedClubs.length)
  console.log('   Locker Rooms:', insertedRooms.length)
  console.log('\n   Next: Place crest images in /public/images/crests/')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
