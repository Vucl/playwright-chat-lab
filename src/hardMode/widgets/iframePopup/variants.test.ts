import { describe, expect, it } from 'vitest'
import { POPUPS, POPUP_VARIANTS } from './variants'

describe('iframe popups', () => {
  it('appear one at a time, in the listed order', () => {
    const times = POPUP_VARIANTS.map((v) => POPUPS[v].showAfter)
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(new Set(times).size).toBe(times.length)
  })

  it('have non-negative timers', () => {
    for (const v of POPUP_VARIANTS) {
      expect(POPUPS[v].showAfter).toBeGreaterThanOrEqual(0)
      expect(POPUPS[v].closeAfter).toBeGreaterThanOrEqual(0)
    }
  })
})
