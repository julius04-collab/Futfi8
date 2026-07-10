---
trigger: always_on
---

# Futfi8 Next.js Core Client Performance Rules

## Overview
Futfi8’s primary consumer segment accesses the app from Android devices operating across mobile data networks (4G or slower) with limited memory profiles. Low latency interface execution is a fundamental system requirement.

### Performance Validation Targets
- Time to First Meaningful Content (TTFMC): `< 2.0 seconds` on a throttled 4G baseline cellular link.
- Time to Interactive (TTI): `< 3.5 seconds`.
- Core Web Vitals Limits: LCP `< 2.5s`, FID `< 100ms`, CLS `< 0.1`.

---

## Server Components Architecture
Default unconditionally to React Server Components (RSC) to minimize shipping runtime JavaScript layers down to the client device. 

```tsx
// GOOD — Server Component; zero JavaScript bytes dispatched to the client browser
// app/(main)/locker-room/[clubId]/page.tsx
export default async function LockerRoomPage({ params }: { params: { clubId: string } }) {
  const lockerRoom = await getLockerRoom(params.clubId)
  const initialPosts = await getInitialPosts(params.clubId)

  return <LockerRoomFeed lockerRoom={lockerRoom} initialPosts={initialPosts} />
}
Rule: Never introduce the "use client" directive into layout files or primary wrapper entry routes unless handling real-time states or event bindings.

Heavy Bundle Code Splitting
Utilize Next.js standard dynamic import systems to defer processing components that reside beneath fold layers or rely on explicit click triggers.

TypeScript
import dynamic from 'next/dynamic'

// Deferred Elements — compiled only when explicitly invoked by user actions
const PostComposer = dynamic(() => import('@/components/post/PostComposer'), {
  loading: () => <PostComposerSkeleton />,
})

const RaidInterface = dynamic(() => import('@/components/raid/RaidInterface'), {
  loading: () => <div className="animate-pulse bg-midnight rounded-lg h-32" />,
})
Bundle Weight Allocations: Initial bundle sizes must remain under 150KB gzipped. Per-route client execution chunks must not cross 50KB gzipped.

Critical Path Font Optimization
Self-host brand font configurations inside the layout layer via next/font/google to minimize layout flashes (FOUT) without pulling external styling files during client instantiation sequences.

TypeScript
// app/layout.tsx
import { Barlow_Condensed, Plus_Jakarta_Sans, Space_Mono } from 'next/font/google'

const barlowCondensed = Barlow_Condensed({
  weight: ['700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  preload: true,
})

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  preload: true,
})
Feed Virtualization Engine
For timeline arrays scaling over 50 active records, implement localized container virtualization using @tanstack/virtual to prevent DOM performance bottlenecks on memory-constrained mobile devices.

TypeScript
// components/locker-room/VirtualPostFeed.tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function VirtualPostFeed({ posts }: { posts: Post[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Theoretical component cell height in pixels
    overscan: 5,
  })

  return (
    <div ref={parentRef} className="overflow-auto h-full">
      <div style={{ height: virtualizer.getTotalSize() }} className="relative w-full">
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <PostCard post={posts[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}