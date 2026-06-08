import { describe, it, expect, vi } from 'vitest'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            range: vi.fn(),
            limit: vi.fn(),
          })),
        })),
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
  },
}))

describe('PostFeed', () => {
  it('exports PostFeed component', async () => {
    const mod = await import('@/components/locker-room/PostFeed')
    expect(mod.PostFeed).toBeDefined()
  })
})

describe('RaidBanner', () => {
  it('exports RaidBanner component', async () => {
    const mod = await import('@/components/raid/RaidBanner')
    expect(mod.RaidBanner).toBeDefined()
  })
})

describe('MatchThreadCard', () => {
  it('exports MatchThreadCard component', async () => {
    const mod = await import('@/components/match-thread/MatchThreadCard')
    expect(mod.MatchThreadCard).toBeDefined()
  })
})
