import { describe, expect, it } from 'vitest'
import {
  buildTodayNumbersRows,
  buildTodayNumbersSummary,
  countPlannedSets,
  estimateTonnage,
  hasTargetLoads,
} from '../src/domains/session/lib/today-numbers'
import type { MovementSlot, SetLog } from '../src/shared/types'

function set(setIndex: number, over: Partial<SetLog> = {}): SetLog {
  return { id: `set-${setIndex}`, setIndex, completed: false, ...over }
}

function movement(name: string, sets: SetLog[], over: Partial<MovementSlot> = {}): MovementSlot {
  return {
    id: `slot-${name}`,
    movementId: name.toLowerCase(),
    movementName: name,
    role: 'main',
    orderIndex: 0,
    targetSummary: `${sets.length}×? summary`,
    sets,
    ...over,
  }
}

const squat = movement('Squat', [
  set(1, { targetLoad: 62.5, targetReps: 5 }),
  set(2, { targetLoad: 62.5, targetReps: 5 }),
  set(3, { targetLoad: 62.5, targetReps: 5 }),
])

const press = movement('Overhead Press', [
  set(1, { targetLoad: 40, targetReps: 12 }),
  set(2, { targetLoad: 40, targetReps: 12 }),
])

const loadless = movement(
  'Chin-Up',
  [set(1, { targetRepMin: 6, targetRepMax: 10 }), set(2, { targetRepMin: 6, targetRepMax: 10 })],
  { role: 'accessory', targetSummary: '2 sets · 6-10 reps', previous: { movementId: 'chin-up', label: 'last: BW × 8' } },
)

describe('countPlannedSets / hasTargetLoads / estimateTonnage', () => {
  it('counts sets across movements', () => {
    expect(countPlannedSets({ movements: [squat, press, loadless] })).toBe(7)
    expect(countPlannedSets({ movements: [] })).toBe(0)
  })

  it('detects whether any set projects a load', () => {
    expect(hasTargetLoads({ movements: [squat, loadless] })).toBe(true)
    expect(hasTargetLoads({ movements: [loadless] })).toBe(false)
  })

  it('sums load × reps, using the bottom of rep ranges and skipping loadless sets', () => {
    // 3×5×62.5 + 2×12×40 = 937.5 + 960 = 1897.5 → 1898
    expect(estimateTonnage({ movements: [squat, press, loadless] })).toBe(1898)
  })

  it('counts AMRAP sets only when they carry a rep floor', () => {
    const amrapWithReps = movement('Bench', [set(1, { targetLoad: 100, targetReps: 5, isAmrap: true })])
    const amrapNoReps = movement('Bench', [set(1, { targetLoad: 100, isAmrap: true })])
    expect(estimateTonnage({ movements: [amrapWithReps] })).toBe(500)
    expect(estimateTonnage({ movements: [amrapNoReps] })).toBe(0)
  })
})

describe('buildTodayNumbersSummary', () => {
  it('includes tonnage and "target loads" when loads are projected', () => {
    expect(buildTodayNumbersSummary({ units: 'kg', movements: [squat, press, loadless] })).toBe(
      '7 planned sets · ~1,898 kg · target loads',
    )
  })

  it('falls back to a movement count when nothing projects a load', () => {
    expect(buildTodayNumbersSummary({ units: 'kg', movements: [loadless] })).toBe('2 planned sets · 1 movement')
  })

  it('omits the tonnage part when loads exist but no reps are known', () => {
    const noReps = movement('Squat', [set(1, { targetLoad: 60 })])
    expect(buildTodayNumbersSummary({ units: 'kg', movements: [noReps] })).toBe('1 planned set · target loads')
  })

  it('handles singular set counts', () => {
    const single = movement('Squat', [set(1, { targetLoad: 60, targetReps: 5 })])
    expect(buildTodayNumbersSummary({ units: 'lb', movements: [single] })).toBe('1 planned set · ~300 lb · target loads')
  })
})

describe('buildTodayNumbersRows', () => {
  it('groups consecutive identical sets into chunks', () => {
    const rows = buildTodayNumbersRows({ units: 'kg', movements: [squat] })
    expect(rows).toEqual([
      { slotId: 'slot-Squat', movementName: 'Squat', targets: ['3×5 · 62.5 kg'], previousLabel: null },
    ])
  })

  it('splits chunks when the load or reps change (non-consecutive stays split)', () => {
    const wave = movement('Squat', [
      set(1, { targetLoad: 60, targetReps: 5 }),
      set(2, { targetLoad: 70, targetReps: 3 }),
      set(3, { targetLoad: 60, targetReps: 5 }),
    ])
    expect(buildTodayNumbersRows({ units: 'kg', movements: [wave] })[0].targets).toEqual([
      '1×5 · 60 kg',
      '1×3 · 70 kg',
      '1×5 · 60 kg',
    ])
  })

  it('labels AMRAP sets with a trailing plus', () => {
    const fiveThreeOne = movement('Deadlift', [
      set(1, { targetLoad: 140, targetReps: 5 }),
      set(2, { targetLoad: 150, targetReps: 3 }),
      set(3, { targetLoad: 160, targetReps: 1, isAmrap: true }),
    ])
    expect(buildTodayNumbersRows({ units: 'kg', movements: [fiveThreeOne] })[0].targets).toEqual([
      '1×5 · 140 kg',
      '1×3 · 150 kg',
      '1×1+ · 160 kg',
    ])
  })

  it('renders rep ranges and mixed loadless sets inside a loaded movement', () => {
    const mixed = movement('Row', [
      set(1, { targetLoad: 50, targetRepMin: 8, targetRepMax: 12 }),
      set(2, { targetRepMin: 8, targetRepMax: 12 }),
    ])
    expect(buildTodayNumbersRows({ units: 'kg', movements: [mixed] })[0].targets).toEqual(['1×8-12 · 50 kg', '1×8-12'])
  })

  it('falls back to targetSummary for fully loadless movements and keeps the previous label', () => {
    const rows = buildTodayNumbersRows({ units: 'kg', movements: [loadless] })
    expect(rows[0].targets).toEqual(['2 sets · 6-10 reps'])
    expect(rows[0].previousLabel).toBe('last: BW × 8')
  })
})
