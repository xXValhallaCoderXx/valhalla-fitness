import { describe, expect, it } from 'vitest'
import {
  buildTodayHistorySupport,
  todayHistoryWindowStart,
} from '@sheetless/domain/history/today-history-support'
import type { HistorySessionInput } from '@sheetless/domain/history/history'

function session(id: string, completedAt: string, actualLoad: number): HistorySessionInput {
  return {
    id,
    plannedSessionId: 'day-a',
    title: 'Day A',
    programTitle: 'Atlas',
    templateId: 'atlas',
    programInstanceId: 'program-1',
    scheduledDate: completedAt.slice(0, 10),
    completedAt,
    units: 'kg',
    weekLabel: 'Week',
    weekIndex: 0,
    hardness: 'Medium',
    estimatedMinutes: 60,
    movementCount: 1,
    isAdHoc: false,
    isFavorite: false,
    plannedSetCount: 1,
    exercises: [
      {
        id: `exercise-${id}`,
        plannedMovementId: 'squat',
        performedMovementId: 'squat',
        performedMovementName: 'Squat',
        role: 'main',
        targetSummary: '1 x 5',
        sets: [
          {
            id: `set-${id}`,
            setIndex: 0,
            targetLoad: actualLoad,
            targetReps: 5,
            targetRepMin: null,
            targetRepMax: null,
            targetRir: 2,
            actualLoad,
            actualReps: 5,
            actualRir: 2,
            completed: true,
            isTopSet: true,
            isAmrap: false,
            isBackoff: false,
          },
        ],
      },
    ],
  }
}

describe('Today history support', () => {
  it('builds only the Today panels read model from recent sessions', () => {
    const result = buildTodayHistorySupport({
      sessions: [
        session('latest', '2026-07-27T09:00:00.000Z', 110),
        session('prior', '2026-07-20T09:00:00.000Z', 100),
      ],
      hasCompletedSessions: true,
      now: new Date('2026-07-28T09:00:00.000Z'),
      today: '2026-07-28',
    })

    expect(result.hasCompletedSessions).toBe(true)
    expect(result.units).toBe('kg')
    expect(result.weeklyVolume).toHaveLength(2)
    expect(result.consistency.currentStreakWeeks).toBe(2)
    expect(result.bodyLoad.topRegions[0]).toMatchObject({
      regionId: 'quads',
      lastTrainedAt: '2026-07-27',
    })
    expect(result).not.toHaveProperty('bestSets')
    expect(result).not.toHaveProperty('movementSummaries')
    expect(result).not.toHaveProperty('insights')
  })

  it('keeps lifetime training presence independent of an empty recent window', () => {
    const result = buildTodayHistorySupport({
      sessions: [],
      hasCompletedSessions: true,
      now: new Date('2026-07-28T09:00:00.000Z'),
      today: '2026-07-28',
    })

    expect(result.hasCompletedSessions).toBe(true)
    expect(result.weeklyVolume).toEqual([])
    expect(result.consistency.currentStreakWeeks).toBe(0)
  })

  it('anchors the bounded read to twelve weeks before the account calendar date', () => {
    expect(todayHistoryWindowStart('2026-07-28')).toBe('2026-05-05')
  })
})
