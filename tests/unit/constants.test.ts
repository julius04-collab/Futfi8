import { describe, it, expect } from 'vitest'
import { RAID_WINDOW_DURATION_MS, PREMIER_LEAGUE_ID, PREMIER_LEAGUE_CODE, UUID_REGEX } from '@/lib/constants'
import { isMatchFinished, isMatchLive } from '@/lib/football-api/client'

describe('constants', () => {
  it('raid window duration is exactly 2 hours', () => {
    expect(RAID_WINDOW_DURATION_MS).toBe(2 * 60 * 60 * 1000)
  })

  it('premier league id is 39', () => {
    expect(PREMIER_LEAGUE_ID).toBe(39)
  })

  it('premier league code is PL', () => {
    expect(PREMIER_LEAGUE_CODE).toBe('PL')
  })

  it('UUID regex matches valid UUIDs', () => {
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(UUID_REGEX.test('not-a-uuid')).toBe(false)
  })
})

describe('football-api client', () => {
  it('isMatchFinished returns true for FINISHED, AWARDED', () => {
    expect(isMatchFinished('FINISHED')).toBe(true)
    expect(isMatchFinished('AWARDED')).toBe(true)
    expect(isMatchFinished('IN_PLAY')).toBe(false)
    expect(isMatchFinished('SCHEDULED')).toBe(false)
  })

  it('isMatchLive returns true for in-play statuses', () => {
    expect(isMatchLive('IN_PLAY')).toBe(true)
    expect(isMatchLive('PAUSED')).toBe(true)
    expect(isMatchLive('FINISHED')).toBe(false)
    expect(isMatchLive('SCHEDULED')).toBe(false)
  })
})
