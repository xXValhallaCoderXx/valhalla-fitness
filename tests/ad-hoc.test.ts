import { describe, expect, it } from 'vitest'
import {
  AD_HOC_DEFAULT_SET_COUNT,
  AD_HOC_TEMPLATE_ID,
  buildAdHocMovementSlot,
  buildAdHocSnapshot,
  DEFAULT_AD_HOC_TITLE,
  favoriteWorkoutFromRow,
  nextAdHocSlotId,
  normalizeAdHocTitle,
  seedMovementsFromSource,
} from '../src/domains/session/lib/ad-hoc'
import type { MovementSlot, SetLog, WorkoutSession } from '../src/shared/types'

function completedSet(setIndex: number, over: Partial<SetLog> = {}): SetLog {
  return { id: `set-${setIndex}`, setIndex, completed: true, actualLoad: 40, actualReps: 8, ...over }
}

function sourceSession(movements: MovementSlot[]): WorkoutSession {
  return {
    ...buildAdHocSnapshot({ scheduledDate: '2026-07-01', units: 'kg', rounding: 2.5, movements }),
    sessionId: 'source-1',
    status: 'completed',
    isAdHoc: true,
  }
}

describe('normalizeAdHocTitle', () => {
  it('trims, rejects empty, and caps length', () => {
    expect(normalizeAdHocTitle('  Push day ')).toBe('Push day')
    expect(normalizeAdHocTitle('')).toBeNull()
    expect(normalizeAdHocTitle('   ')).toBeNull()
    expect(normalizeAdHocTitle(undefined)).toBeNull()
    expect(normalizeAdHocTitle('x'.repeat(80))).toHaveLength(60)
  })
})

describe('buildAdHocSnapshot', () => {
  it('fills plan-only fields with neutral sentinels', () => {
    const snapshot = buildAdHocSnapshot({ scheduledDate: '2026-07-03', units: 'lb', rounding: 5 })
    expect(snapshot.kind).toBe('ad_hoc')
    expect(snapshot.templateId).toBe(AD_HOC_TEMPLATE_ID)
    expect(snapshot.title).toBe(DEFAULT_AD_HOC_TITLE)
    expect(snapshot.hardness).toBeNull()
    expect(snapshot.weekLabel).toBe('')
    expect(snapshot.weekIndex).toBe(0)
    expect(snapshot.estimatedMinutes).toBe(0)
    expect(snapshot.units).toBe('lb')
    expect(snapshot.rounding).toBe(5)
    expect(snapshot.movements).toEqual([])
  })

  it('keeps a provided title after normalising it', () => {
    expect(buildAdHocSnapshot({ title: ' Push day ', scheduledDate: '2026-07-03', units: 'kg', rounding: 2.5 }).title).toBe('Push day')
    expect(buildAdHocSnapshot({ title: '  ', scheduledDate: '2026-07-03', units: 'kg', rounding: 2.5 }).title).toBe(DEFAULT_AD_HOC_TITLE)
  })
})

describe('buildAdHocMovementSlot', () => {
  it('builds an open slot with all-null targets and unfinished sets', () => {
    const slot = buildAdHocMovementSlot({
      slotId: 'adhoc-1-bench_press',
      movementId: 'bench_press',
      movementName: 'Bench Press',
      role: 'main',
      orderIndex: 0,
      setCount: AD_HOC_DEFAULT_SET_COUNT,
    })
    expect(slot.role).toBe('main')
    expect(slot.isAdded).toBe(true)
    expect(slot.previous).toBeNull()
    expect(slot.sets).toHaveLength(3)
    expect(slot.sets.map((set) => set.setIndex)).toEqual([1, 2, 3])
    for (const set of slot.sets) {
      expect(set.targetLoad).toBeNull()
      expect(set.targetReps).toBeNull()
      expect(set.targetRepMin).toBeNull()
      expect(set.targetRir).toBeNull()
      expect(set.completed).toBe(false)
    }
  })

  it('never builds fewer than one set', () => {
    const slot = buildAdHocMovementSlot({
      slotId: 'adhoc-1-plank',
      movementId: 'plank',
      movementName: 'Plank',
      role: 'accessory',
      orderIndex: 0,
      setCount: 0,
    })
    expect(slot.sets).toHaveLength(1)
  })
})

describe('nextAdHocSlotId', () => {
  it('numbers slots and sanitises the movement id', () => {
    expect(nextAdHocSlotId(new Set(), 'bench_press')).toBe('adhoc-1-bench_press')
    expect(nextAdHocSlotId(new Set(['adhoc-1-bench_press']), 'bench press!')).toBe('adhoc-2-bench-press-')
  })

  it('skips over collisions', () => {
    const used = new Set(['adhoc-1-squat', 'adhoc-2-squat'])
    expect(nextAdHocSlotId(used, 'squat')).toBe('adhoc-3-squat')
  })

  it('only counts ad-hoc slots when numbering', () => {
    const used = new Set(['slot-day-a-squat', 'adhoc-1-squat'])
    expect(nextAdHocSlotId(used, 'bench_press')).toBe('adhoc-2-bench_press')
  })
})

describe('seedMovementsFromSource', () => {
  const bench: MovementSlot = {
    id: 'exercise-log-1',
    slotId: 'slot-day-a-bench',
    movementId: 'bench_press',
    movementName: 'Bench Press',
    performedMovementId: 'larsen_press',
    performedMovementName: 'Larsen Press',
    role: 'main',
    orderIndex: 3,
    targetSummary: '3 × 5',
    sets: [completedSet(1), completedSet(2), completedSet(3, { completed: false })],
    previous: { movementId: 'larsen_press', label: 'Last time', load: 60, reps: 5 },
  }
  const row: MovementSlot = {
    id: 'exercise-log-2',
    slotId: 'slot-day-a-row',
    movementId: 'seated_cable_row',
    movementName: 'Seated Cable Row',
    role: 'accessory',
    orderIndex: 1,
    targetSummary: '8-12 reps',
    sets: [completedSet(1, { completed: false }), completedSet(2, { completed: false })],
  }

  it('repeats what was performed, re-packed dense in source order, with fresh empty sets', () => {
    const seeded = seedMovementsFromSource(sourceSession([bench, row]))
    expect(seeded.map((movement) => movement.movementId)).toEqual(['seated_cable_row', 'larsen_press'])
    expect(seeded.map((movement) => movement.orderIndex)).toEqual([0, 1])
    expect(seeded.map((movement) => movement.role)).toEqual(['accessory', 'main'])
    expect(seeded[1].movementName).toBe('Larsen Press')
    expect(seeded[1].slotId).toBe('adhoc-2-larsen_press')
    // Set count mirrors what was actually completed; none completed falls back to the total.
    expect(seeded[1].sets).toHaveLength(2)
    expect(seeded[0].sets).toHaveLength(2)
    for (const movement of seeded) {
      expect(movement.previous).toBeNull()
      expect(movement.sets.every((set) => !set.completed && set.targetLoad === null)).toBe(true)
    }
  })

  it('keeps at least one set when the source had none', () => {
    const empty: MovementSlot = { ...row, sets: [] }
    const seeded = seedMovementsFromSource(sourceSession([empty]))
    expect(seeded[0].sets).toHaveLength(1)
  })
})

describe('favoriteWorkoutFromRow', () => {
  it('maps a session row into a favourites card model', () => {
    const snapshot = buildAdHocSnapshot({
      title: 'Extra bench day',
      scheduledDate: '2026-07-01',
      units: 'kg',
      rounding: 2.5,
      movements: seedMovementsFromSource(
        sourceSession([
          {
            id: 'x1',
            slotId: 'adhoc-1-bench_press',
            movementId: 'bench_press',
            movementName: 'Bench Press',
            role: 'main',
            orderIndex: 0,
            targetSummary: 'Ad hoc',
            sets: [completedSet(1), completedSet(2)],
          },
        ]),
      ),
    })
    const favorite = favoriteWorkoutFromRow({ id: 'session-1', completed_at: '2026-07-01T12:45:00Z', prescription_snapshot: snapshot })
    expect(favorite).toEqual({
      sessionId: 'session-1',
      title: 'Extra bench day',
      movementNames: ['Bench Press'],
      movementCount: 1,
      setCount: 2,
      completedAt: '2026-07-01T12:45:00Z',
    })
  })

  it('tolerates a missing snapshot', () => {
    const favorite = favoriteWorkoutFromRow({ id: 'session-2', completed_at: null, prescription_snapshot: null })
    expect(favorite.title).toBe(DEFAULT_AD_HOC_TITLE)
    expect(favorite.movementNames).toEqual([])
    expect(favorite.setCount).toBe(0)
    expect(favorite.completedAt).toBeNull()
  })
})
