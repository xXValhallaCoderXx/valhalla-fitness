import { describe, expect, it } from 'vitest'
import type { MovementSlot, PlannedSession, SetLog } from '~/domains/session'
import {
  buildPreviousComparable,
  selectPreviousComparables,
  type PreviousComparableCandidate,
} from '~/domains/session/lib/previous-comparable'

function completedSet(
  actualLoad: number | null,
  actualReps: number,
  extra: Partial<SetLog> = {},
): SetLog {
  return {
    id: `set-${actualLoad}-${actualReps}`,
    setIndex: 0,
    actualLoad,
    actualReps,
    actualRir: 2,
    completed: true,
    ...extra,
  }
}

function movement(extra: Partial<MovementSlot> = {}): MovementSlot {
  return {
    id: 'slot-pull',
    slotId: 'slot-pull',
    movementId: 'lat_pulldown',
    movementName: 'Lat Pulldown',
    performedMovementId: 'pull_up',
    performedMovementName: 'Pull-Up',
    role: 'accessory',
    orderIndex: 0,
    targetSummary: '3 × 8-12',
    sets: [],
    ...extra,
  }
}

function plannedSession(slot: MovementSlot = movement()): PlannedSession {
  return {
    id: 'planned-session',
    title: 'Pull',
    programTitle: 'Programme',
    templateId: 'template-a',
    weekIndex: 1,
    weekLabel: 'Week 2',
    hardness: 'Medium',
    scheduledDate: '2026-07-30',
    timeZone: 'Asia/Singapore',
    estimatedMinutes: 45,
    units: 'kg',
    rounding: 2.5,
    movements: [slot],
  }
}

function candidate(
  extra: Partial<PreviousComparableCandidate> = {},
): PreviousComparableCandidate {
  return {
    exerciseId: 'exercise-a',
    slotId: 'slot-pull',
    plannedMovementId: 'lat_pulldown',
    performedMovementId: 'pull_up',
    role: 'accessory',
    completedAt: '2026-07-20T10:00:00.000Z',
    scheduledDate: '2026-07-20',
    templateId: 'template-a',
    timeZone: 'Asia/Singapore',
    units: 'kg',
    sets: [completedSet(0, 8)],
    ...extra,
  }
}

describe('previous comparable selection', () => {
  it('only considers work actually performed as the effective movement', () => {
    const result = selectPreviousComparables(plannedSession(), [
      candidate({
        exerciseId: 'planned-only',
        performedMovementId: 'lat_pulldown',
        scheduledDate: '2026-07-29',
        sets: [completedSet(80, 12)],
      }),
      candidate({
        exerciseId: 'actual-pull-up',
        slotId: 'different-slot',
        plannedMovementId: 'chin_up',
        scheduledDate: '2026-07-10',
        sets: [completedSet(0, 10)],
      }),
    ])

    expect(result['slot-pull']).toMatchObject({
      movementId: 'pull_up',
      load: null,
      reps: 10,
      workoutDate: '2026-07-10',
    })
  })

  it('prefers a matching programme slot over a newer generic performance', () => {
    const result = selectPreviousComparables(plannedSession(), [
      candidate({
        exerciseId: 'same-slot',
        scheduledDate: '2026-07-10',
        sets: [completedSet(20, 8)],
      }),
      candidate({
        exerciseId: 'generic-newer',
        slotId: 'other-slot',
        plannedMovementId: 'chin_up',
        role: 'main',
        templateId: 'template-b',
        scheduledDate: '2026-07-29',
        sets: [completedSet(30, 12)],
      }),
    ])

    expect(result['slot-pull']).toMatchObject({
      load: 20,
      reps: 8,
      workoutDate: '2026-07-10',
    })
  })

  it('uses scheduled date before completion time for equal-score recency', () => {
    const result = selectPreviousComparables(plannedSession(), [
      candidate({
        exerciseId: 'overnight-older',
        scheduledDate: '2026-07-20',
        completedAt: '2026-07-22T01:00:00.000Z',
        sets: [completedSet(20, 8)],
      }),
      candidate({
        exerciseId: 'scheduled-newer',
        scheduledDate: '2026-07-21',
        completedAt: '2026-07-21T10:00:00.000Z',
        sets: [completedSet(22.5, 8)],
      }),
    ])

    expect(result['slot-pull']?.workoutDate).toBe('2026-07-21')
  })

  it('excludes completed candidates scheduled after the planned workout date', () => {
    const result = selectPreviousComparables(plannedSession(), [
      candidate({
        exerciseId: 'future-same-slot',
        scheduledDate: '2026-07-31',
        sets: [completedSet(40, 12)],
      }),
      candidate({
        exerciseId: 'same-day-other-slot',
        slotId: 'other-slot',
        scheduledDate: '2026-07-30',
        sets: [completedSet(20, 8)],
      }),
    ])

    expect(result['slot-pull']).toMatchObject({
      load: 20,
      reps: 8,
      workoutDate: '2026-07-30',
    })
  })

  it('breaks otherwise equal ties with a stable exercise id', () => {
    const result = selectPreviousComparables(plannedSession(), [
      candidate({
        exerciseId: 'exercise-a',
        sets: [completedSet(20, 8)],
      }),
      candidate({
        exerciseId: 'exercise-z',
        sets: [completedSet(25, 8)],
      }),
    ])

    expect(result['slot-pull']?.load).toBe(25)
  })

  it('falls through an eligible empty exercise to completed work', () => {
    const result = selectPreviousComparables(plannedSession(), [
      candidate({
        exerciseId: 'empty-same-slot',
        scheduledDate: '2026-07-29',
        sets: [],
      }),
      candidate({
        exerciseId: 'completed-older',
        slotId: 'other-slot',
        scheduledDate: '2026-07-20',
        sets: [completedSet(15, 10)],
      }),
    ])

    expect(result['slot-pull']).toMatchObject({ load: 15, reps: 10 })
  })
})

describe('previous comparable read model', () => {
  it('normalizes loadless sets and omits e1RM', () => {
    const result = buildPreviousComparable(
      movement(),
      candidate({
        sets: [
          completedSet(0, 8, { setIndex: 0 }),
          completedSet(null, 12, { setIndex: 1 }),
        ],
      }),
      'kg',
    )

    expect(result).toMatchObject({
      load: null,
      reps: 12,
      e1rm: null,
      label: expect.stringContaining('Previous comparable: bodyweight × 12'),
      sets: [
        { setIndex: 0, load: null, reps: 8 },
        { setIndex: 1, load: null, reps: 12 },
      ],
    })
    expect(result?.label).toContain('Jul 20')
    expect(result?.label).not.toContain('2026-07-20')
  })

  it('keeps positive external load and calculates main-lift e1RM', () => {
    const main = movement({
      movementId: 'squat',
      performedMovementId: 'squat',
      role: 'main',
    })
    const result = buildPreviousComparable(
      main,
      candidate({
        performedMovementId: 'squat',
        sets: [completedSet(100, 5, { isTopSet: true })],
      }),
      'kg',
    )

    expect(result).toMatchObject({
      movementId: 'squat',
      load: 100,
      reps: 5,
      setType: 'top_set',
    })
    expect(result?.e1rm).toBeGreaterThan(100)
  })

  it('converts headline, e1RM, and per-set loads into the planned-session units', () => {
    const main = movement({
      movementId: 'squat',
      performedMovementId: 'squat',
      role: 'main',
    })
    const result = buildPreviousComparable(
      main,
      candidate({
        performedMovementId: 'squat',
        units: 'kg',
        timeZone: ' Asia/Singapore ',
        sets: [
          completedSet(100, 5, { setIndex: 1, isTopSet: true }),
          completedSet(80, 8, { setIndex: 2, isBackoff: true }),
        ],
      }),
      'lb',
    )

    expect(result?.load).toBeCloseTo(220.462262185)
    expect(result?.e1rm).toBe(272)
    expect(result?.label).toContain('220.5 lb × 5')
    expect(result?.timeZone).toBe('Asia/Singapore')
    expect(result?.sets?.[0]?.load).toBeCloseTo(220.462262185)
    expect(result?.sets?.[1]?.load).toBeCloseTo(176.369809748)
  })
})
