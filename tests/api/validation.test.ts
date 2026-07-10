import { describe, it, expect, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {} as any,
}))

vi.mock('@/lib/auth/getAuthUser', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@/lib/membership', () => ({
  joinClub: vi.fn(),
  getLastClubSwitch: vi.fn(),
  canSwitchClub: vi.fn(),
  switchClub: vi.fn(),
}))

import { getAuthUser } from '@/lib/auth/getAuthUser'
import { joinClub } from '@/lib/membership'

beforeAll(() => {
  vi.mocked(getAuthUser).mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001', email: 'test@test.com' } as any)
  vi.mocked(joinClub).mockResolvedValue({ membership: { id: '1' }, isNew: true })
})

describe('POST /api/posts — validation', () => {
  it('returns 400 VALIDATION_ERROR when fields are missing', async () => {
    const { POST } = await import('@/app/api/posts/route')

    const req = new NextRequest('http://localhost/api/posts', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/posts/[id]/react — validation', () => {
  it('returns 400 VALIDATION_ERROR when type is invalid', async () => {
    const { POST } = await import('@/app/api/posts/[id]/react/route')

    const req = new NextRequest('http://localhost/api/posts/some-id/react', {
      method: 'POST',
      body: JSON.stringify({ type: 'invalid' }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' }) })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/memberships — validation', () => {
  it('returns 400 VALIDATION_ERROR when locker_room_id is not a UUID', async () => {
    const { POST } = await import('@/app/api/memberships/route')

    const req = new NextRequest('http://localhost/api/memberships', {
      method: 'POST',
      body: JSON.stringify({ locker_room_id: 'not-a-uuid' }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
