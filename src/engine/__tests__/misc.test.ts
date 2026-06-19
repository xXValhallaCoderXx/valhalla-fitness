import { describe, it, expect } from 'vitest'
import { nextSetHint } from '../hints'
import { accessorySuggestion } from '../accessories'
import { sessionForWeekday, liftForSession, isDeloadWeek, advanceWeek } from '../schedule'

describe('nextSetHint (spec §6.1)', () => {
  it('missed target → drop_load', () => {
    expect(nextSetHint(5, 4, 2).kind).toBe('drop_load')
  })
  it('hit target but grind (RIR≤1) → reduce_next', () => {
    expect(nextSetHint(5, 5, 1).kind).toBe('reduce_next')
  })
  it('hit target very easy (RIR≥4) → too_easy', () => {
    expect(nextSetHint(5, 5, 4).kind).toBe('too_easy')
  })
  it('hit target with reserve → proceed', () => {
    expect(nextSetHint(5, 5, 2).kind).toBe('proceed')
  })
})

describe('accessorySuggestion (double progression)', () => {
  it('suggests +2.5 when all sets hit the top of the range with reserve', () => {
    const r = accessorySuggestion(40, 12, [
      { reps: 12, rir: 2 },
      { reps: 12, rir: 3 },
      { reps: 13, rir: 2 },
    ])
    expect(r).not.toBeNull()
    expect(r?.addWeightKg).toBe(2.5)
    expect(r?.newWeight).toBe(42.5)
    expect(r?.resetToBottom).toBe(true)
  })
  it('returns null when not all sets hit the top', () => {
    expect(accessorySuggestion(40, 12, [{ reps: 12, rir: 2 }, { reps: 10, rir: 2 }])).toBeNull()
  })
  it('returns null when sets hit top but no reserve', () => {
    expect(accessorySuggestion(40, 12, [{ reps: 12, rir: 0 }])).toBeNull()
  })
})

describe('schedule', () => {
  it('maps weekdays to sessions', () => {
    expect(sessionForWeekday(1)).toBe('squat')
    expect(sessionForWeekday(3)).toBe('bench')
    expect(sessionForWeekday(5)).toBe('deadlift')
    expect(sessionForWeekday(2)).toBe('sport')
    expect(sessionForWeekday(6)).toBe('sport')
    expect(sessionForWeekday(4)).toBe('assist')
    expect(sessionForWeekday(0)).toBe('rest')
  })
  it('resolves the lift for a session', () => {
    expect(liftForSession('squat')).toBe('squat')
    expect(liftForSession('assist')).toBeNull()
    expect(liftForSession('sport')).toBeNull()
    expect(liftForSession('z2')).toBeNull()
  })
  it('flags the deload week', () => {
    expect(isDeloadWeek(3)).toBe(true)
    expect(isDeloadWeek(0)).toBe(false)
  })
  it('advances the cycle pointer, rolling into the next cycle', () => {
    expect(advanceWeek(0, 0)).toEqual({ cycleIndex: 0, weekIndex: 1 })
    expect(advanceWeek(0, 3)).toEqual({ cycleIndex: 1, weekIndex: 0 })
  })
})
