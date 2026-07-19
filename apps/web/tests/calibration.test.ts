import { describe, expect, it } from 'vitest'
import {
  buildCalibration,
  calibrationSignalLabels,
} from '../src/domains/history/lib/calibration'
import type {
  HistoryExerciseInput,
  HistorySessionInput,
  HistorySetInput,
} from '../src/domains/history/lib/history'

const NOW = '2026-07-05T12:00:00.000Z'

function makeSet(overrides: Partial<HistorySetInput> = {}): HistorySetInput {
  return {
    id: 'set-1',
    setIndex: 0,
    targetLoad: 100,
    targetReps: 5,
    targetRir: 2,
    actualLoad: 100,
    actualReps: 5,
    actualRir: 2,
    completed: true,
    ...overrides,
  }
}

function pairedSets(count: number, actualRir: number, targetRir = 2): HistorySetInput[] {
  return Array.from({ length: count }, (_, index) =>
    makeSet({ id: `set-${index}`, setIndex: index, actualRir, targetRir }),
  )
}

function makeExercise(sets: HistorySetInput[]): HistoryExerciseInput {
  return {
    id: 'exercise-1',
    plannedMovementId: 'back-squat',
    performedMovementId: 'back-squat',
    performedMovementName: 'Back Squat',
    role: 'main',
    sets,
  }
}

function makeSession(overrides: Partial<HistorySessionInput> = {}): HistorySessionInput {
  return {
    id: 'session-1',
    plannedSessionId: null,
    title: 'Session',
    programInstanceId: 'program-1',
    scheduledDate: '2026-06-29',
    completedAt: '2026-06-29T10:00:00.000Z',
    units: 'kg',
    movementCount: 1,
    plannedSetCount: 3,
    exercises: [],
    ...overrides,
  }
}

function planSession(
  id: string,
  completedAt: string,
  sets: HistorySetInput[],
  overrides: Partial<HistorySessionInput> = {},
): HistorySessionInput {
  return makeSession({
    id,
    completedAt,
    scheduledDate: completedAt.slice(0, 10),
    exercises: [makeExercise(sets)],
    ...overrides,
  })
}

describe('buildCalibration — paired-set selection', () => {
  it('counts only completed sets with both target and actual RIR', () => {
    const sets = [
      ...pairedSets(4, 3),
      makeSet({ id: 'no-target-1', targetRir: null }),
      makeSet({ id: 'no-target-2', targetRir: undefined }),
      makeSet({ id: 'no-actual-1', actualRir: null }),
      makeSet({ id: 'no-actual-2', actualRir: undefined }),
      makeSet({ id: 'incomplete', completed: false }),
    ]
    const summary = buildCalibration([planSession('s1', '2026-06-29T10:00:00.000Z', sets)], NOW)

    expect(summary.pairedSetCount).toBe(4)
    expect(summary.weekly).toHaveLength(1)
    expect(summary.weekly[0].pairedSets).toBe(4)
    expect(summary.signal).toBe('no_rir_data')
    expect(summary.meanGap).toBeNull()
  })

  it('excludes ad-hoc sessions (programInstanceId null) even with paired RIR', () => {
    const sessions = [
      planSession('adhoc-1', '2026-06-29T10:00:00.000Z', pairedSets(12, 3), {
        programInstanceId: null,
      }),
      planSession('adhoc-2', '2026-06-22T10:00:00.000Z', pairedSets(12, 1), {
        programInstanceId: undefined,
      }),
    ]
    const summary = buildCalibration(sessions, NOW)

    expect(summary.pairedSetCount).toBe(0)
    expect(summary.weekly).toEqual([])
    expect(summary.signal).toBe('no_rir_data')
    expect(summary.rirFatigue).toBe('insufficient')
  })
})

describe('buildCalibration — headline signal', () => {
  it('returns no_rir_data below 10 paired sets, a verdict at 10', () => {
    const nine = buildCalibration([planSession('s1', '2026-06-29T10:00:00.000Z', pairedSets(9, 2))], NOW)
    expect(nine.signal).toBe('no_rir_data')
    expect(nine.meanGap).toBeNull()
    expect(nine.pairedSetCount).toBe(9)

    const ten = buildCalibration([planSession('s1', '2026-06-29T10:00:00.000Z', pairedSets(10, 3))], NOW)
    expect(ten.signal).toBe('leaning_easy')
    expect(ten.meanGap).toBe(1)
    expect(ten.pairedSetCount).toBe(10)
  })

  it('classifies mean gap +1 as leaning_easy and -1 as leaning_hard', () => {
    const easy = buildCalibration([planSession('s1', '2026-06-29T10:00:00.000Z', pairedSets(10, 3))], NOW)
    expect(easy.meanGap).toBe(1)
    expect(easy.signal).toBe('leaning_easy')

    const hard = buildCalibration([planSession('s1', '2026-06-29T10:00:00.000Z', pairedSets(10, 1))], NOW)
    expect(hard.meanGap).toBe(-1)
    expect(hard.signal).toBe('leaning_hard')
  })

  it('classifies |gap| at or under 0.75 as on_target', () => {
    const half = buildCalibration(
      [planSession('s1', '2026-06-29T10:00:00.000Z', [...pairedSets(5, 3), ...pairedSets(5, 2)])],
      NOW,
    )
    expect(half.meanGap).toBe(0.5)
    expect(half.signal).toBe('on_target')

    const boundary = buildCalibration(
      [planSession('s1', '2026-06-29T10:00:00.000Z', pairedSets(10, 2.75))],
      NOW,
    )
    expect(boundary.meanGap).toBe(0.75)
    expect(boundary.signal).toBe('on_target')
  })

  it('excludes sets older than 6 weeks from the headline but keeps them in weekly', () => {
    const sessions = [
      planSession('recent', '2026-06-30T10:00:00.000Z', pairedSets(10, 3)),
      planSession('old', '2026-05-01T10:00:00.000Z', pairedSets(10, 2)),
    ]
    const summary = buildCalibration(sessions, NOW)

    expect(summary.pairedSetCount).toBe(10)
    expect(summary.meanGap).toBe(1)
    expect(summary.signal).toBe('leaning_easy')
    expect(summary.weekly.map((week) => week.weekStart)).toEqual(['2026-04-27', '2026-06-29'])
    expect(summary.weekly[0].pairedSets).toBe(10)
    expect(summary.weekly[0].meanGap).toBe(0)
  })

  it('reports no_rir_data when all paired sets are older than the window', () => {
    const summary = buildCalibration(
      [planSession('old', '2026-05-01T10:00:00.000Z', pairedSets(10, 3))],
      NOW,
    )
    expect(summary.signal).toBe('no_rir_data')
    expect(summary.meanGap).toBeNull()
    expect(summary.pairedSetCount).toBe(0)
    expect(summary.weekly).toHaveLength(1)
    expect(summary.weekly[0].pairedSets).toBe(10)
  })
})

describe('buildCalibration — weekly samples', () => {
  it('rounds weekly means to 2 decimals and labels the Monday-UTC week', () => {
    const sets = [
      makeSet({ id: 'a', actualRir: 3, targetRir: 2 }),
      makeSet({ id: 'b', actualRir: 2, targetRir: 2 }),
      makeSet({ id: 'c', actualRir: 2, targetRir: 2 }),
    ]
    const summary = buildCalibration([planSession('s1', '2026-06-30T10:00:00.000Z', sets)], NOW)

    expect(summary.weekly).toEqual([
      {
        weekStart: '2026-06-29',
        weekLabel: 'Jun 29',
        pairedSets: 3,
        meanActualRir: 2.33,
        meanGap: 0.33,
      },
    ])
  })
})

describe('buildCalibration — rirFatigue', () => {
  it('fires on 3 qualifying weeks strictly falling by at least 1.0 (2.5 → 1.8 → 1.2)', () => {
    const sessions = [
      planSession('w3', '2026-06-29T10:00:00.000Z', pairedSets(3, 1.2)),
      planSession('w2', '2026-06-22T10:00:00.000Z', pairedSets(3, 1.8)),
      planSession('w1', '2026-06-15T10:00:00.000Z', pairedSets(3, 2.5)),
    ]
    expect(buildCalibration(sessions, NOW).rirFatigue).toBe('fatigue_rising')
  })

  it('stays clear when the drop is under 1.0 (2.5 → 2.4 → 2.3)', () => {
    const sessions = [
      planSession('w3', '2026-06-29T10:00:00.000Z', pairedSets(3, 2.3)),
      planSession('w2', '2026-06-22T10:00:00.000Z', pairedSets(3, 2.4)),
      planSession('w1', '2026-06-15T10:00:00.000Z', pairedSets(3, 2.5)),
    ]
    expect(buildCalibration(sessions, NOW).rirFatigue).toBe('clear')
  })

  it('stays clear when the trend is non-monotonic (2.5 → 1.0 → 1.4)', () => {
    const sessions = [
      planSession('w3', '2026-06-29T10:00:00.000Z', pairedSets(3, 1.4)),
      planSession('w2', '2026-06-22T10:00:00.000Z', pairedSets(3, 1.0)),
      planSession('w1', '2026-06-15T10:00:00.000Z', pairedSets(3, 2.5)),
    ]
    expect(buildCalibration(sessions, NOW).rirFatigue).toBe('clear')
  })

  it('ignores weeks with fewer than 3 paired sets — insufficient with only 2 qualifying weeks', () => {
    const sessions = [
      planSession('w3', '2026-06-29T10:00:00.000Z', pairedSets(3, 1.2)),
      planSession('w2', '2026-06-22T10:00:00.000Z', pairedSets(2, 1.8)),
      planSession('w1', '2026-06-15T10:00:00.000Z', pairedSets(3, 2.5)),
    ]
    expect(buildCalibration(sessions, NOW).rirFatigue).toBe('insufficient')
  })

  it('skips unqualified weeks when assembling the trailing window', () => {
    const sessions = [
      planSession('w4', '2026-06-29T10:00:00.000Z', pairedSets(3, 1.2)),
      // 2 paired sets with a high mean: would break the trend if it counted.
      planSession('w3', '2026-06-22T10:00:00.000Z', pairedSets(2, 5)),
      planSession('w2', '2026-06-15T10:00:00.000Z', pairedSets(3, 2.5)),
      planSession('w1', '2026-06-08T10:00:00.000Z', pairedSets(3, 3.0)),
    ]
    expect(buildCalibration(sessions, NOW).rirFatigue).toBe('fatigue_rising')
  })

  it('only considers the last 3 qualifying weeks — an earlier rise does not block it', () => {
    const sessions = [
      planSession('w4', '2026-06-29T10:00:00.000Z', pairedSets(3, 1.2)),
      planSession('w3', '2026-06-22T10:00:00.000Z', pairedSets(3, 1.8)),
      planSession('w2', '2026-06-15T10:00:00.000Z', pairedSets(3, 2.5)),
      planSession('w1', '2026-06-08T10:00:00.000Z', pairedSets(3, 1.0)),
    ]
    expect(buildCalibration(sessions, NOW).rirFatigue).toBe('fatigue_rising')
  })
})

describe('calibrationSignalLabels', () => {
  it('maps every signal to its display copy', () => {
    expect(calibrationSignalLabels).toEqual({
      on_target: 'Dialed in',
      leaning_easy: 'Room to push',
      leaning_hard: 'Running hot',
      no_rir_data: 'Not enough RIR data',
    })
  })
})
