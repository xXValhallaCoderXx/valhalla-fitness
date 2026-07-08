import { describe, expect, it } from 'vitest'
import {
  buildPriorBests,
  detectSessionPrs,
  loadKey,
  type PriorBests,
  type PriorSetSample,
} from '../src/domains/session/lib/session-prs'
import { e1rm } from '../src/shared/lib/math'
import type { MovementSlot, SetLog, WorkoutSession } from '../src/shared/types'

function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'set-1',
    setIndex: 1,
    targetLoad: null,
    targetReps: null,
    completed: true,
    actualLoad: 80,
    actualReps: 5,
    actualRir: 2,
    ...overrides,
  }
}

function makeMovement(overrides: Partial<MovementSlot> = {}): MovementSlot {
  return {
    id: 'exercise-1',
    movementId: 'squat',
    movementName: 'Back squat',
    performedMovementId: 'squat',
    performedMovementName: 'Back squat',
    role: 'main',
    orderIndex: 0,
    targetSummary: '3×5',
    sets: [makeSet()],
    ...overrides,
  }
}

function makeSession(movements: MovementSlot[]): WorkoutSession {
  return {
    id: 'planned-1',
    sessionId: 'session-1',
    status: 'in_progress',
    title: 'Day A',
    programTitle: 'Program',
    templateId: 'template',
    weekIndex: 0,
    weekLabel: 'Week 1',
    hardness: null,
    scheduledDate: '2026-07-08',
    estimatedMinutes: 45,
    units: 'kg',
    rounding: 2.5,
    movements,
  }
}

function priorFrom(samples: PriorSetSample[]): Record<string, PriorBests> {
  return { squat: buildPriorBests(samples) }
}

describe('buildPriorBests', () => {
  it('aggregates max load, max e1RM, and reps at each exact load', () => {
    const bests = buildPriorBests([
      { load: 80, reps: 5, rir: 2 },
      { load: 100, reps: 1, rir: 0 },
      { load: 80, reps: 8, rir: 0 },
      { load: 82.5, reps: 3, rir: 1 },
    ])
    expect(bests.maxLoad).toBe(100)
    expect(bests.repsAtLoad[loadKey(80)]).toBe(8)
    expect(bests.repsAtLoad[loadKey(82.5)]).toBe(3)
    expect(bests.maxE1rm).toBeCloseTo(
      Math.max(e1rm(80, 5, 2), e1rm(100, 1, 0), e1rm(80, 8, 0), e1rm(82.5, 3, 1)),
    )
    expect(bests.sampleCount).toBe(4)
  })

  it('ignores zero-load and zero-rep samples and reports an empty history', () => {
    const bests = buildPriorBests([
      { load: 0, reps: 5, rir: null },
      { load: 80, reps: 0, rir: null },
    ])
    expect(bests.sampleCount).toBe(0)
    expect(bests.maxLoad).toBe(0)
  })
})

describe('detectSessionPrs', () => {
  it('fires a heaviest-weight PR only on strictly greater load', () => {
    const session = makeSession([makeMovement({ sets: [makeSet({ actualLoad: 100, actualReps: 3 })] })])
    const tie = detectSessionPrs(session, priorFrom([{ load: 100, reps: 3, rir: 1 }]))
    expect(tie.filter((pr) => pr.kinds.includes('heaviest_weight'))).toHaveLength(0)

    const beat = detectSessionPrs(session, priorFrom([{ load: 97.5, reps: 3, rir: 1 }]))
    expect(beat).toHaveLength(1)
    expect(beat[0].kinds).toContain('heaviest_weight')
    expect(beat[0].load).toBe(100)
    expect(beat[0].previousLabel).toBe('Old best: 97.5 kg × 3')
  })

  it('fires an e1RM PR from a rep improvement without a weight PR', () => {
    // 80×8@0 (e1rm ≈ 101.3) beats prior bests (90×1 ≈ 93, 80×6 ≈ 96) without touching max load (90).
    const session = makeSession([
      makeMovement({ sets: [makeSet({ actualLoad: 80, actualReps: 8, actualRir: 0 })] }),
    ])
    const prs = detectSessionPrs(
      session,
      priorFrom([
        { load: 90, reps: 1, rir: 0 },
        { load: 80, reps: 6, rir: 0 },
      ]),
    )
    expect(prs).toHaveLength(1)
    expect(prs[0].kinds).toEqual(['best_e1rm', 'rep_record'])
    expect(prs[0].e1rm).toBeCloseTo(80 * (1 + 8 / 30), 0)
  })

  it('counts reps-in-reserve toward the e1RM estimate', () => {
    // Same load/reps, but leaving 3 in the tank estimates a higher max.
    const session = makeSession([
      makeMovement({ sets: [makeSet({ actualLoad: 80, actualReps: 5, actualRir: 3 })] }),
    ])
    const prs = detectSessionPrs(session, priorFrom([{ load: 80, reps: 5, rir: 0 }]))
    expect(prs).toHaveLength(1)
    expect(prs[0].kinds).toEqual(['best_e1rm'])
  })

  it('detects a rep record at an exact prior load, including fractional loads', () => {
    const session = makeSession([
      makeMovement({ sets: [makeSet({ actualLoad: 82.5, actualReps: 5, actualRir: 3 })] }),
    ])
    const prs = detectSessionPrs(
      session,
      priorFrom([
        { load: 100, reps: 5, rir: 0 },
        { load: 82.5, reps: 4, rir: 0 },
      ]),
    )
    expect(prs).toHaveLength(1)
    expect(prs[0].kinds).toContain('rep_record')
    expect(prs[0].previousLabel).toBe('Old best at 82.5 kg: 4 reps')
  })

  it('suppresses the rep record when the weight itself is a record', () => {
    const session = makeSession([
      makeMovement({ sets: [makeSet({ actualLoad: 105, actualReps: 5, actualRir: 0 })] }),
    ])
    const prs = detectSessionPrs(session, priorFrom([{ load: 100, reps: 3, rir: 0 }]))
    expect(prs).toHaveLength(1)
    expect(prs[0].kinds[0]).toBe('heaviest_weight')
    expect(prs[0].kinds).not.toContain('rep_record')
  })

  it('never fires for a movement with no prior history', () => {
    const session = makeSession([makeMovement({ sets: [makeSet({ actualLoad: 200, actualReps: 10 })] })])
    expect(detectSessionPrs(session, {})).toHaveLength(0)
    expect(detectSessionPrs(session, priorFrom([]))).toHaveLength(0)
  })

  it('ignores incomplete and bodyweight sets', () => {
    const session = makeSession([
      makeMovement({
        sets: [
          makeSet({ actualLoad: 200, actualReps: 5, completed: false }),
          makeSet({ actualLoad: null, actualReps: 12 }),
          makeSet({ actualLoad: 0, actualReps: 12 }),
        ],
      }),
    ])
    expect(detectSessionPrs(session, priorFrom([{ load: 100, reps: 5, rir: 0 }]))).toHaveLength(0)
  })

  it('reports one entry per movement with combined kinds', () => {
    const session = makeSession([
      makeMovement({ sets: [makeSet({ actualLoad: 110, actualReps: 5, actualRir: 1 })] }),
      makeMovement({
        id: 'exercise-2',
        movementId: 'bench',
        movementName: 'Bench press',
        performedMovementId: 'bench',
        performedMovementName: 'Bench press',
        sets: [makeSet({ id: 'set-2', actualLoad: 60, actualReps: 5 })],
      }),
    ])
    const prs = detectSessionPrs(session, {
      squat: buildPriorBests([{ load: 100, reps: 5, rir: 1 }]),
      bench: buildPriorBests([{ load: 60, reps: 5, rir: 2 }]),
    })
    expect(prs).toHaveLength(1)
    expect(prs[0].movementName).toBe('Back squat')
    expect(prs[0].kinds).toEqual(['heaviest_weight', 'best_e1rm'])
  })
})
