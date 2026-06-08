import { describe, it, expect } from 'vitest'

describe('constants', () => {
  it('raid window duration is exactly 2 hours', () => {
    const { RAID_WINDOW_DURATION_MS } = require('@/lib/constants')
    expect(RAID_WINDOW_DURATION_MS).toBe(2 * 60 * 60 * 1000)
  })

  it('premier league id is 39', () => {
    const { PREMIER_LEAGUE_ID } = require('@/lib/constants')
    expect(PREMIER_LEAGUE_ID).toBe(39)
  })

  it('UUID regex matches valid UUIDs', () => {
    const { UUID_REGEX } = require('@/lib/constants')
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(UUID_REGEX.test('not-a-uuid')).toBe(false)
  })
})

describe('football-api client', () => {
  it('isMatchFinished returns true for FT, AET, PEN', () => {
    const { isMatchFinished } = require('@/lib/football-api/client')
    expect(isMatchFinished('FT')).toBe(true)
    expect(isMatchFinished('AET')).toBe(true)
    expect(isMatchFinished('PEN')).toBe(true)
    expect(isMatchFinished('1H')).toBe(false)
    expect(isMatchFinished('NS')).toBe(false)
  })

  it('isMatchLive returns true for in-play statuses', () => {
    const { isMatchLive } = require('@/lib/football-api/client')
    expect(isMatchLive('1H')).toBe(true)
    expect(isMatchLive('2H')).toBe(true)
    expect(isMatchLive('HT')).toBe(true)
    expect(isMatchLive('FT')).toBe(false)
    expect(isMatchLive('NS')).toBe(false)
  })
})
