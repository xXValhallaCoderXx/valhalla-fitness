import { describe, expect, it } from 'vitest'
import { formatRest, remaining, resolveRestSeconds } from '../src/domains/session/lib/rest-timer'
import type { MovementSlot } from '../src/shared/types'

const ON = { autoStartTimer: true, defaultRestSeconds: 120 }
const slot = (over: Partial<Pick<MovementSlot, 'role' | 'restSeconds'>>): Pick<MovementSlot, 'role' | 'restSeconds'> => ({
  role: 'main',
  ...over,
})

describe('resolveRestSeconds', () => {
  it('returns null when auto-start is off', () => {
    expect(resolveRestSeconds(slot({ role: 'main' }), { autoStartTimer: false, defaultRestSeconds: 120 })).toBeNull()
  })

  it('scales the global default by movement role', () => {
    expect(resolveRestSeconds(slot({ role: 'main' }), ON)).toBe(180)
    expect(resolveRestSeconds(slot({ role: 'variation' }), ON)).toBe(150)
    expect(resolveRestSeconds(slot({ role: 'accessory' }), ON)).toBe(90)
    expect(resolveRestSeconds(slot({ role: 'warmup' }), ON)).toBe(60)
    expect(resolveRestSeconds(slot({ role: 'event' }), ON)).toBe(180)
  })

  it('moves every role when the global default changes', () => {
    expect(resolveRestSeconds(slot({ role: 'main' }), { autoStartTimer: true, defaultRestSeconds: 90 })).toBe(135)
    expect(resolveRestSeconds(slot({ role: 'accessory' }), { autoStartTimer: true, defaultRestSeconds: 90 })).toBe(68)
  })

  it('honours a per-slot override over the role default', () => {
    expect(resolveRestSeconds(slot({ role: 'accessory', restSeconds: 45 }), ON)).toBe(45)
  })

  it('treats a zero/negative override as "no timer"', () => {
    expect(resolveRestSeconds(slot({ role: 'main', restSeconds: 0 }), ON)).toBeNull()
  })
})

describe('remaining', () => {
  it('ceils the remaining whole seconds', () => {
    expect(remaining(10_000, 8_500)).toBe(2) // 1.5s -> 2
    expect(remaining(10_000, 10_000)).toBe(0)
  })

  it('never goes negative once elapsed', () => {
    expect(remaining(10_000, 12_000)).toBe(0)
  })
})

describe('formatRest', () => {
  it('formats m:ss with a zero-padded seconds field', () => {
    expect(formatRest(65)).toBe('1:05')
    expect(formatRest(5)).toBe('0:05')
    expect(formatRest(125)).toBe('2:05')
    expect(formatRest(0)).toBe('0:00')
    expect(formatRest(-3)).toBe('0:00')
  })
})
