import { describe, expect, it } from 'vitest'
import type { MovementSlot, PreviousComparable, SetLog } from '../src/shared/types'
import { formatPreviousShort, previousSetShort, resolveSetRir, seedLoadForSet, seedRepsForSet } from '../src/domains/session/components/live-session-utils'

function previous(extra: Partial<PreviousComparable> = {}): PreviousComparable {
  return { movementId: 'm1', label: 'Last comparable: 90 kg × 5 @ RIR 3 · e1RM 111 kg - 2026-06-29', ...extra }
}

describe('formatPreviousShort', () => {
  it('renders load and reps with the unit', () => {
    expect(formatPreviousShort(previous({ load: 90, reps: 5 }), 'kg')).toBe('90 kg × 5')
  })

  it('drops the unit when none is provided', () => {
    expect(formatPreviousShort(previous({ load: 92.5, reps: 5 }))).toBe('92.5 × 5')
  })

  it('shows BW when there is no load (bodyweight movement)', () => {
    expect(formatPreviousShort(previous({ load: null, reps: 8 }), 'kg')).toBe('BW × 8')
  })

  it('falls back to an em dash when reps are missing', () => {
    expect(formatPreviousShort(previous({ load: 60, reps: null }), 'kg')).toBe('60 kg × —')
  })
})

describe('previousSetShort', () => {
  const withSets = previous({
    sets: [
      { setIndex: 1, load: 80, reps: 8, rir: 2 },
      { setIndex: 2, load: 82.5, reps: 6, rir: 1 },
      { setIndex: 3, load: null, reps: 12, rir: null },
      { setIndex: 4, load: 60, reps: null, rir: null },
    ],
  })

  it('renders the matching set position without units', () => {
    expect(previousSetShort(withSets, 1)).toBe('last 80 × 8')
    expect(previousSetShort(withSets, 2)).toBe('last 82.5 × 6')
  })

  it('shows BW for loadless sets', () => {
    expect(previousSetShort(withSets, 3)).toBe('last BW × 12')
  })

  it('returns null when the position has no usable reps or does not exist', () => {
    expect(previousSetShort(withSets, 4)).toBeNull()
    expect(previousSetShort(withSets, 9)).toBeNull()
  })

  it('returns null for older snapshots without per-set data, or no previous at all', () => {
    expect(previousSetShort(previous(), 1)).toBeNull()
    expect(previousSetShort(null, 1)).toBeNull()
    expect(previousSetShort(undefined, 1)).toBeNull()
  })
})

describe('resolveSetRir', () => {
  it('uses a just-tapped draft over everything else', () => {
    expect(resolveSetRir({ draftRir: 1, savedRir: 3, completed: false, suggestedRir: 2 })).toBe(1)
  })

  it('shows the saved RIR after a set is completed (the carry-over bug)', () => {
    // Set was completed by accepting the carried-over suggestion: no draft, but actualRir was saved.
    expect(resolveSetRir({ savedRir: 2, completed: true })).toBe(2)
  })

  it('keeps RIR 0 visible (not treated as empty)', () => {
    expect(resolveSetRir({ savedRir: 0, completed: true })).toBe(0)
  })

  it('shows the carried-over suggestion while the set is still open', () => {
    expect(resolveSetRir({ completed: false, suggestedRir: 2 })).toBe(2)
  })

  it('ignores the suggestion once the set is completed without a saved value', () => {
    expect(resolveSetRir({ completed: true, suggestedRir: 2 })).toBeUndefined()
  })

  it('is empty for an untouched open set with no suggestion', () => {
    expect(resolveSetRir({ completed: false })).toBeUndefined()
  })
})

describe('seedLoadForSet', () => {
  function slotSet(partial: Partial<SetLog>): SetLog {
    return { id: `s${partial.setIndex ?? 1}`, setIndex: 1, completed: false, ...partial } as SetLog
  }

  function slot(sets: SetLog[], previousLoad?: number | null): MovementSlot {
    return {
      id: 'm1',
      movementId: 'cable_crunch',
      movementName: 'Cable Crunch',
      role: 'accessory',
      orderIndex: 1,
      targetSummary: '3 x 8-12',
      sets,
      previous: previousLoad === undefined ? null : previous({ load: previousLoad }),
    } as MovementSlot
  }

  it('keeps a logged weight, including an explicit 0 (bodyweight)', () => {
    const logged = slotSet({ setIndex: 2, actualLoad: 42.5 })
    expect(seedLoadForSet(slot([logged]), logged)).toBe(42.5)
    const bodyweight = slotSet({ setIndex: 2, actualLoad: 0 })
    expect(seedLoadForSet(slot([bodyweight]), bodyweight)).toBe(0)
  })

  it('prefers the prescribed target over carry-over (percent/state main lifts)', () => {
    const sets = [slotSet({ setIndex: 1, completed: true, actualLoad: 50 }), slotSet({ setIndex: 2, targetLoad: 60 })]
    expect(seedLoadForSet(slot(sets), sets[1]!)).toBe(60)
  })

  it('carries the nearest earlier completed weight for user-selected loads', () => {
    const sets = [
      slotSet({ setIndex: 1, completed: true, actualLoad: 50 }),
      slotSet({ setIndex: 2, completed: true, actualLoad: 55 }),
      slotSet({ setIndex: 3 }),
    ]
    expect(seedLoadForSet(slot(sets), sets[2]!)).toBe(55)
  })

  it('never carries from later sets, incomplete sets, or zero-load sets', () => {
    const sets = [
      slotSet({ setIndex: 1, completed: true, actualLoad: 0 }),
      slotSet({ setIndex: 2, actualLoad: 60 }),
      slotSet({ setIndex: 3 }),
      slotSet({ setIndex: 4, completed: true, actualLoad: 70 }),
    ]
    expect(seedLoadForSet(slot(sets), sets[2]!)).toBe(0)
  })

  it("falls back to last session's comparable load for the first set", () => {
    const sets = [slotSet({ setIndex: 1 })]
    expect(seedLoadForSet(slot(sets, 12.5), sets[0]!)).toBe(12.5)
  })

  it('defaults to 0 with no history at all', () => {
    const sets = [slotSet({ setIndex: 1 })]
    expect(seedLoadForSet(slot(sets), sets[0]!)).toBe(0)
    expect(seedLoadForSet(slot(sets, null), sets[0]!)).toBe(0)
  })
})

describe('seedRepsForSet', () => {
  function slotSet(partial: Partial<SetLog>): SetLog {
    return { id: `s${partial.setIndex ?? 1}`, setIndex: 1, completed: false, ...partial } as SetLog
  }

  function slot(sets: SetLog[], previousReps?: number | null): MovementSlot {
    return {
      id: 'm1',
      movementId: 'bench_press',
      movementName: 'Bench Press',
      role: 'main',
      orderIndex: 0,
      targetSummary: 'Ad hoc',
      sets,
      previous: previousReps === undefined ? null : previous({ reps: previousReps }),
    } as MovementSlot
  }

  it('keeps logged reps, then prefers the prescribed target', () => {
    const logged = slotSet({ setIndex: 1, actualReps: 7, targetReps: 5 })
    expect(seedRepsForSet(slot([logged]), logged)).toBe(7)
    const targeted = slotSet({ setIndex: 1, targetReps: 5 })
    expect(seedRepsForSet(slot([targeted]), targeted)).toBe(5)
    const ranged = slotSet({ setIndex: 1, targetRepMin: 8, targetRepMax: 12 })
    expect(seedRepsForSet(slot([ranged]), ranged)).toBe(8)
  })

  it('carries the nearest earlier completed reps for target-less ad-hoc sets', () => {
    const sets = [
      slotSet({ setIndex: 1, completed: true, actualReps: 10 }),
      slotSet({ setIndex: 2, completed: true, actualReps: 8 }),
      slotSet({ setIndex: 3 }),
    ]
    expect(seedRepsForSet(slot(sets), sets[2]!)).toBe(8)
  })

  it('never carries from later or incomplete sets', () => {
    const sets = [
      slotSet({ setIndex: 1, actualReps: 12 }),
      slotSet({ setIndex: 2 }),
      slotSet({ setIndex: 3, completed: true, actualReps: 9 }),
    ]
    expect(seedRepsForSet(slot(sets), sets[1]!)).toBe(0)
  })

  it("falls back to last session's comparable reps, then 0", () => {
    const sets = [slotSet({ setIndex: 1 })]
    expect(seedRepsForSet(slot(sets, 6), sets[0]!)).toBe(6)
    expect(seedRepsForSet(slot(sets, null), sets[0]!)).toBe(0)
    expect(seedRepsForSet(slot(sets), sets[0]!)).toBe(0)
  })
})
