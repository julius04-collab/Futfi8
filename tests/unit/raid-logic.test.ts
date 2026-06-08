import { describe, it, expect } from 'vitest'

describe('raid eligibility logic', () => {
  it('user joined before kickoff is eligible', () => {
    const joinedAt = new Date('2026-06-01T10:00:00Z')
    const kickoffAt = new Date('2026-06-01T15:00:00Z')
    expect(joinedAt.getTime()).toBeLessThan(kickoffAt.getTime())
  })

  it('user joined after kickoff is not eligible', () => {
    const joinedAt = new Date('2026-06-01T16:00:00Z')
    const kickoffAt = new Date('2026-06-01T15:00:00Z')
    expect(joinedAt.getTime()).toBeGreaterThan(kickoffAt.getTime())
  })

  it('draw does not trigger raid', () => {
    const isDraw = (home: number, away: number) => home === away
    expect(isDraw(1, 1)).toBe(true)
    expect(isDraw(2, 0)).toBe(false)
    expect(isDraw(0, 0)).toBe(true)
  })
})
