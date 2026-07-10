# club-profiles.md — Club Profiles & Static Data

## Overview

Club data in Futfi8 is the single source of truth for all 20 Premier
League clubs. It is static — clubs don't change mid-season. Club data
is defined once in code as a constant and seeded once into the database.

Never hardcode club names, IDs, or colors anywhere in the codebase.
Always reference from `lib/utils/clubs.ts` or from the database via
`clubs.slug`.

When vibecoding this feature, always have these files active:
- `project.md`
- `database-mechanics.md`
- `database-schema.md`
- `design-system.md`

---

## The 20 Premier League Clubs

Canonical club data. This is the source of truth.

```ts
// lib/utils/clubs.ts
export const CLUBS: Club[] = [
  {
    id: '',           // Populated from DB — use slug as key in code
    name: 'Arsenal',
    short_name: 'ARS',
    slug: 'arsenal',
    primary_color: '#EF0107',
    secondary_color: '#FFFFFF',
    api_team_id: 42,
  },
  {
    id: '',
    name: 'Aston Villa',
    short_name: 'AVL',
    slug: 'aston-villa',
    primary_color: '#95BFE5',
    secondary_color: '#670E36',
    api_team_id: 66,
  },
  {
    id: '',
    name: 'Bournemouth',
    short_name: 'BOU',
    slug: 'bournemouth',
    primary_color: '#DA291C',
    secondary_color: '#000000',
    api_team_id: 35,
  },
  {
    id: '',
    name: 'Brentford',
    short_name: 'BRE',
    slug: 'brentford',
    primary_color: '#E30613',
    secondary_color: '#FFFFFF',
    api_team_id: 55,
  },
  {
    id: '',
    name: 'Brighton',
    short_name: 'BHA',
    slug: 'brighton',
    primary_color: '#0057B8',
    secondary_color: '#FFFFFF',
    api_team_id: 51,
  },
  {
    id: '',
    name: 'Chelsea',
    short_name: 'CHE',
    slug: 'chelsea',
    primary_color: '#034694',
    secondary_color: '#FFFFFF',
    api_team_id: 49,
  },
  {
    id: '',
    name: 'Crystal Palace',
    short_name: 'CRY',
    slug: 'crystal-palace',
    primary_color: '#1B458F',
    secondary_color: '#C4122E',
    api_team_id: 52,
  },
  {
    id: '',
    name: 'Everton',
    short_name: 'EVE',
    slug: 'everton',
    primary_color: '#003399',
    secondary_color: '#FFFFFF',
    api_team_id: 45,
  },
  {
    id: '',
    name: 'Fulham',
    short_name: 'FUL',
    slug: 'fulham',
    primary_color: '#FFFFFF',
    secondary_color: '#000000',
    api_team_id: 36,
  },
  {
    id: '',
    name: 'Ipswich',
    short_name: 'IPS',
    slug: 'ipswich',
    primary_color: '#0044A9',
    secondary_color: '#FFFFFF',
    api_team_id: 57,
  },
  {
    id: '',
    name: 'Leicester',
    short_name: 'LEI',
    slug: 'leicester',
    primary_color: '#003090',
    secondary_color: '#FDBE11',
    api_team_id: 46,
  },
  {
    id: '',
    name: 'Liverpool',
    short_name: 'LIV',
    slug: 'liverpool',
    primary_color: '#C8102E',
    secondary_color: '#F6EB61',
    api_team_id: 40,
  },
  {
    id: '',
    name: 'Manchester City',
    short_name: 'MCI',
    slug: 'man-city',
    primary_color: '#6CABDD',
    secondary_color: '#FFFFFF',
    api_team_id: 50,
  },
  {
    id: '',
    name: 'Manchester United',
    short_name: 'MUN',
    slug: 'man-united',
    primary_color: '#DA291C',
    secondary_color: '#FBE122',
    api_team_id: 33,
  },
  {
    id: '',
    name: 'Newcastle',
    short_name: 'NEW',
    slug: 'newcastle',
    primary_color: '#241F20',
    secondary_color: '#FFFFFF',
    api_team_id: 34,
  },
  {
    id: '',
    name: 'Nottingham Forest',
    short_name: 'NFO',
    slug: 'nottm-forest',
    primary_color: '#DD0000',
    secondary_color: '#FFFFFF',
    api_team_id: 65,
  },
  {
    id: '',
    name: 'Southampton',
    short_name: 'SOU',
    slug: 'southampton',
    primary_color: '#D71920',
    secondary_color: '#FFFFFF',
    api_team_id: 41,
  },
  {
    id: '',
    name: 'Tottenham',
    short_name: 'TOT',
    slug: 'tottenham',
    primary_color: '#132257',
    secondary_color: '#FFFFFF',
    api_team_id: 47,
  },
  {
    id: '',
    name: 'West Ham',
    short_name: 'WHU',
    slug: 'west-ham',
    primary_color: '#7A263A',
    secondary_color: '#1BB1E7',
    api_team_id: 48,
  },
  {
    id: '',
    name: 'Wolves',
    short_name: 'WOL',
    slug: 'wolves',
    primary_color: '#FDB913',
    secondary_color: '#231F20',
    api_team_id: 39,
  },
]

// Lookup helpers
export function getClubBySlug(slug: string): Club | undefined {
  return CLUBS.find(c => c.slug === slug)
}

export function getClubByApiTeamId(apiTeamId: number): Club | undefined {
  return CLUBS.find(c => c.api_team_id === apiTeamId)
}
```

---

## TypeScript Types

```ts
// types/app.types.ts

export type BadgeLevel = 'fan' | 'regular' | 'veteran' | 'legend' | 'og'

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed'

export type PostType = 'standard' | 'raid' | 'match_thread' | 'hot_take'

export interface Club {
  id: string
  name: string
  short_name: string
  slug: string
  primary_color: string
  secondary_color: string
  api_team_id: number
  crest_url?: string
}

export interface LockerRoom {
  id: string
  club_id: string
  member_count: number
  created_at: string
}

export interface User {
  id: string
  username: string
  avatar_url: string | null
  home_club_id: string | null
  created_at: string
}

export interface Membership {
  id: string
  user_id: string
  locker_room_id: string
  fan_cred_score: number
  badge_level: BadgeLevel
  joined_at: string
}

export interface Post {
  id: string
  author_id: string | null
  author?: User
  locker_room_id: string | null
  content: string
  type: PostType
  match_id: string | null
  raid_window_id: string | null
  match_thread_id: string | null
  club_tag_id: string | null
  club_tag?: Club
  is_raid_post: boolean
  upvote_count: number
  is_removed: boolean
  created_at: string
  reactions?: Reaction[]
}

export interface Match {
  id: string
  home_club_id: string
  away_club_id: string
  home_club?: Club
  away_club?: Club
  kickoff_at: string
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  winner_club_id: string | null
  api_match_id: number
}

export interface RaidWindow {
  id: string
  match_id: string
  raiding_club_id: string
  defending_club_id: string
  raiding_locker_room_id: string
  defending_locker_room_id: string
  opens_at: string
  closes_at: string
  status: 'active' | 'closed'
  raid_post_count: number
}

export interface MatchThread {
  id: string
  match_id: string
  locker_room_id: string
  opens_at: string
  closes_at: string
  status: 'scheduled' | 'open' | 'closed'
  post_count: number
}

export interface Reaction {
  id: string
  user_id: string
  post_id: string
  type: 'upvote' | 'fire' | 'laugh' | 'rage'
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  reference_type: string | null
  reference_id: string | null
  is_read: boolean
  created_at: string
}

export interface AppError {
  code: string
  message: string
  status: number
  details?: unknown
}
```

---

## Database Seed

```sql
-- supabase/seed.sql
-- Seed all 20 Premier League clubs
-- Run once on initial setup

insert into public.clubs (name, short_name, slug, primary_color, secondary_color, crest_url, api_team_id)
values
  ('Arsenal',            'ARS', 'arsenal',       '#EF0107', '#FFFFFF', '/crests/arsenal.svg',       42),
  ('Aston Villa',        'AVL', 'aston-villa',   '#95BFE5', '#670E36', '/crests/aston-villa.svg',   66),
  ('Bournemouth',        'BOU', 'bournemouth',   '#DA291C', '#000000', '/crests/bournemouth.svg',   35),
  ('Brentford',          'BRE', 'brentford',     '#E30613', '#FFFFFF', '/crests/brentford.svg',     55),
  ('Brighton',           'BHA', 'brighton',      '#0057B8', '#FFFFFF', '/crests/brighton.svg',      51),
  ('Chelsea',            'CHE', 'chelsea',       '#034694', '#FFFFFF', '/crests/chelsea.svg',       49),
  ('Crystal Palace',     'CRY', 'crystal-palace','#1B458F', '#C4122E', '/crests/crystal-palace.svg',52),
  ('Everton',            'EVE', 'everton',       '#003399', '#FFFFFF', '/crests/everton.svg',       45),
  ('Fulham',             'FUL', 'fulham',        '#FFFFFF', '#000000', '/crests/fulham.svg',        36),
  ('Ipswich',            'IPS', 'ipswich',       '#0044A9', '#FFFFFF', '/crests/ipswich.svg',       57),
  ('Leicester',          'LEI', 'leicester',     '#003090', '#FDBE11', '/crests/leicester.svg',     46),
  ('Liverpool',          'LIV', 'liverpool',     '#C8102E', '#F6EB61', '/crests/liverpool.svg',     40),
  ('Manchester City',    'MCI', 'man-city',      '#6CABDD', '#FFFFFF', '/crests/man-city.svg',      50),
  ('Manchester United',  'MUN', 'man-united',    '#DA291C', '#FBE122', '/crests/man-united.svg',    33),
  ('Newcastle',          'NEW', 'newcastle',     '#241F20', '#FFFFFF', '/crests/newcastle.svg',     34),
  ('Nottingham Forest',  'NFO', 'nottm-forest',  '#DD0000', '#FFFFFF', '/crests/nottm-forest.svg',  65),
  ('Southampton',        'SOU', 'southampton',   '#D71920', '#FFFFFF', '/crests/southampton.svg',   41),
  ('Tottenham',          'TOT', 'tottenham',     '#132257', '#FFFFFF', '/crests/tottenham.svg',     47),
  ('West Ham',           'WHU', 'west-ham',      '#7A263A', '#1BB1E7', '/crests/west-ham.svg',      48),
  ('Wolves',             'WOL', 'wolves',        '#FDB913', '#231F20', '/crests/wolves.svg',        39);

-- Create one locker room per club
insert into public.locker_rooms (club_id)
select id from public.clubs;
```

---

## API Routes

### Get All Clubs

```ts
// app/api/clubs/route.ts
export async function GET() {
  const supabase = createSupabaseServerClient()

  const { data: clubs, error } = await supabase
    .from('clubs')
    .select('id, name, short_name, slug, primary_color, secondary_color, crest_url')
    .order('name')

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load clubs.' } },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: clubs,
    meta: { timestamp: new Date().toISOString() },
  })
}
```

### Get Single Club

```ts
// app/api/clubs/[clubId]/route.ts
export async function GET(
  _request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  const supabase = createSupabaseServerClient()

  // Accept both UUID and slug
  const isUUID = /^[0-9a-f-]{36}$/.test(params.clubId)

  const query = supabase
    .from('clubs')
    .select(`
      id, name, short_name, slug, primary_color, secondary_color, crest_url,
      locker_rooms(id, member_count)
    `)

  const { data: club, error } = isUUID
    ? await query.eq('id', params.clubId).single()
    : await query.eq('slug', params.clubId).single()

  if (error || !club) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Club not found.' } },
      { status: 404 }
    )
  }

  return NextResponse.json({
    data: club,
    meta: { timestamp: new Date().toISOString() },
  })
}
```

---

## UI Components

### `ClubCrest`

Reusable club crest component used everywhere crests appear.

```tsx
// components/ui/ClubCrest.tsx
interface ClubCrestProps {
  slug: string
  name: string
  size?: 24 | 32 | 40 | 48 | 64
  className?: string
}

export function ClubCrest({ slug, name, size = 32, className }: ClubCrestProps) {
  return (
    <Image
      src={`/crests/${slug}.svg`}
      alt={`${name} crest`}
      width={size}
      height={size}
      className={className}
    />
  )
}
```

### `ClubColorBadge`

Renders a club name badge using the club's primary color.

```tsx
// components/ui/ClubColorBadge.tsx
interface ClubColorBadgeProps {
  club: Pick<Club, 'name' | 'primary_color'>
  size?: 'sm' | 'md'
}

export function ClubColorBadge({ club, size = 'sm' }: ClubColorBadgeProps) {
  return (
    <span
      className={cn(
        'inline-block font-body font-medium rounded-full',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      )}
      style={{
        backgroundColor: `${club.primary_color}22`,  // 13% opacity
        color: club.primary_color,
        border: `1px solid ${club.primary_color}44`,  // 27% opacity
      }}
    >
      {club.name}
    </span>
  )
}
```

---

## Crest Assets

All 20 club crests must be present in `public/crests/` as SVG files
named exactly by slug:

```
public/crests/
├── arsenal.svg
├── aston-villa.svg
├── bournemouth.svg
├── brentford.svg
├── brighton.svg
├── chelsea.svg
├── crystal-palace.svg
├── everton.svg
├── fulham.svg
├── ipswich.svg
├── leicester.svg
├── liverpool.svg
├── man-city.svg
├── man-united.svg
├── newcastle.svg
├── nottm-forest.svg
├── southampton.svg
├── tottenham.svg
├── west-ham.svg
└── wolves.svg
```

SVG sources: Official club crests are available from
Wikipedia Commons (CC licensed) or from API-Football's team crest URLs.
Download and store locally — never reference external crest URLs
in production as they can break or change.

---

## Utility Helpers

```ts
// lib/utils/clubs.ts — additional helpers

// Format relative time for posts
export function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diff = now - date

  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

// Get club color with opacity
export function getClubColor(primaryColor: string, opacity = 1): string {
  if (opacity === 1) return primaryColor
  const hex = primaryColor.replace('#', '')
  const opacityHex = Math.round(opacity * 255).toString(16).padStart(2, '0')
  return `#${hex}${opacityHex}`
}

// Check if a slug is a valid club slug
export function isValidClubSlug(slug: string): boolean {
  return CLUBS.some(c => c.slug === slug)
}
```

---

## Club Profiles Rules

1. `CLUBS` constant in `lib/utils/clubs.ts` is the canonical source — never hardcode elsewhere
2. Club slugs are used in URLs — always kebab-case matching the `slug` field
3. All 20 crests must exist as SVGs in `public/crests/{slug}.svg`
4. Never reference external crest URLs — always serve locally from `public/crests/`
5. `api_team_id` is the bridge to API-Football — must be accurate for polling to work
6. Club colors are used with opacity for backgrounds — never solid primary_color as bg
7. Accept both UUID and slug in single-club API route — slug is used in URLs
8. Club data is seeded once — never mutated by application code
9. One locker room per club — created automatically in seed
10. `CLUBS` constant `id` fields are empty strings — always fetch from DB for actual UUIDs
