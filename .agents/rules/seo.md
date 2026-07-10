---
trigger: always_on
---

# SEO & Metadata Conventions

## Metadata Template

Every page exports a `metadata` object or `generateMetadata` function:

```ts
// Static metadata (no dynamic data needed)
export const metadata: Metadata = {
  title: 'Hot Takes — Futfi8',
  description: 'The hottest Premier League takes. Join the conversation.',
}

// Dynamic metadata (depends on route params or data)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const club = await getClubBySlug(params.slug)

  return {
    title: `${club.name} Locker Room — Futfi8`,
    description: `Join the ${club.name} locker room on Futfi8. Drop takes, react to matchday action, and defend your turf.`,
    openGraph: {
      title: `${club.name} Locker Room — Futfi8`,
      description: `Join the ${club.name} locker room on Futfi8.`,
      images: [{ url: `/og/locker-room?club=${club.slug}`, width: 1200, height: 630 }],
    },
  }
}
```

## Route Metadata Map

| Route | `title` | `description` |
|---|---|---|
| `/` | Futfi8 — The football. The fight. | The Premier League community. Join your club's locker room. |
| `/login` | Sign In — Futfi8 | Sign in to your Futfi8 account. |
| `/register` | Join Futfi8 — Create Account | Create your Futfi8 account and pick your club. |
| `/locker-room/[slug]` | `{name} Locker Room — Futfi8` | Join the `{name}` locker room on Futfi8. |
| `/hot-takes` | Hot Takes — Futfi8 | The hottest Premier League takes. |
| `/match/[id]` | `{home} vs {away} — Futfi8` | Live match thread for `{home}` vs `{away}`. |
| `/profile/[id]` | `@{username} — Futfi8` | `{username}`'s profile on Futfi8. |
| `/notifications` | Notifications — Futfi8 | Your Futfi8 notifications. |

## Open Graph Images

### Static OG Image (Homepage)
```
public/og/default.png  (1200x630px)
```

### Dynamic OG Images
For pages that need club-specific or match-specific OG images, use the `@vercel/og` image generation:

```ts
// app/api/og/locker-room/route.tsx
import { ImageResponse } from '@vercel/og'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const club = searchParams.get('club') ?? 'arsenal'

  return new ImageResponse(
    (
      <div style={{ background: '#0D0D0F', width: 1200, height: 630, display: 'flex' }}>
        {/* Club crest + name */}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

OG image URL format: `/og/locker-room?club=arsenal`

## Sitemap

```ts
// app/sitemap.ts
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServerClient()

  // Static routes
  const staticRoutes = [
    { url: 'https://futfi8.com', lastModified: new Date(), priority: 1.0 },
    { url: 'https://futfi8.com/hot-takes', priority: 0.8 },
  ]

  // Dynamic club routes
  const { data: clubs } = await supabase.from('clubs').select('slug')
  const clubRoutes = (clubs ?? []).map(club => ({
    url: `https://futfi8.com/locker-room/${club.slug}`,
    priority: 0.9,
  }))

  return [...staticRoutes, ...clubRoutes]
}
```

## Robots

```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: '/api/' },
      { userAgent: '*', disallow: '/onboarding/' },
    ],
    sitemap: 'https://futfi8.com/sitemap.xml',
  }
}
```

## Structured Data (JSON-LD)

For key pages, add structured data:

```tsx
// In locker room page
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'OnlineCommunity',
      name: `${club.name} Locker Room`,
      description: `Futfi8 locker room for ${club.name} fans.`,
      url: `https://futfi8.com/locker-room/${club.slug}`,
    }),
  }}
/>
```

Only add structured data to: locker room pages, match pages, and the homepage.

## Canonical URLs

Every page uses the canonical URL matching its primary route:

```ts
export const metadata: Metadata = {
  alternates: { canonical: '/hot-takes' },
}
```

No query parameters in canonical URLs — `?sort=new` is not part of the canonical.

## SEO Rules

1. Every page exports `metadata` or `generateMetadata` — no page without a title
2. Title format: `{Page Specific} — Futfi8` (not `Futfi8 — {Page Specific}`)
3. Descriptions are 120–160 characters — long enough to be useful, short enough for search results
4. OG images are 1200×630px — the standard social share size
5. Sitemap auto-generates club routes from the database
6. `robots.ts` blocks API and onboarding routes from indexing
7. Canonical URLs omit query parameters — only the base route
8. JSON-LD structured data only on locker room, match, and home pages
9. Use `@vercel/og` for dynamic OG images — not static templates
10. Match page metadata references both club names — critical for search relevance
