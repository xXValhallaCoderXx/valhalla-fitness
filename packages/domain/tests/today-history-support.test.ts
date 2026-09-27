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

it('uses all completed dates for a long run while detailed volume history stays bounded', () => {
  const dates = Array.from({ length: 20 }, (_, index) => {
    const date = new Date('2026-09-21T00:00:00Z')
    date.setUTCDate(date.getUTCDate() - index * 7)
    return date.toISOString().slice(0, 10)
  })
  const result = buildTodayHistorySupport({ sessions: [], hasCompletedSessions: true,
    completedDates: dates, today: '2026-09-27', now: new Date('2026-09-27T12:00:00Z'), displayUnits: 'lb' })
  expect(result.consistency.currentStreakWeeks).toBe(20)
  expect(result.calendarWeek?.days.map(day => day.completedSessions)).toEqual([1, 0, 0, 0, 0, 0, 0])
  expect(result.calendarWeek?.volumeChangePercent).toBeNull()
  expect(result.units).toBe('lb')
})

it('counts multiple workouts per calendar day, ignores future dates, and compares the preceding full week', () => {
  const result = buildTodayHistorySupport({ sessions: [
    session('monday', '2026-09-21T09:00:00Z', 100), session('second', '2026-09-21T11:00:00Z', 50),
    session('prior', '2026-09-20T11:00:00Z', 100), session('future', '2026-09-28T11:00:00Z', 1000),
  ], hasCompletedSessions: true, today: '2026-09-21', now: new Date('2026-09-20T17:00:00Z') })
  expect(result.calendarWeek).toMatchObject({ weekStart: '2026-09-21', completedSessions: 2,
    volume: 750, previousWeekVolume: 500, volumeChangePercent: 50 })
  expect(result.calendarWeek?.days[0]).toEqual({ date: '2026-09-21', completedSessions: 2 })
})

it('does not compare against an older populated week or break the run during an empty current week', () => {
  const result = buildTodayHistorySupport({ sessions: [session('old', '2026-09-07T09:00:00Z', 100)],
    hasCompletedSessions: true, completedDates: ['2026-09-07', '2026-09-14'],
    today: '2026-09-21', now: new Date('2026-09-21T12:00:00Z') })
  expect(result.calendarWeek).toMatchObject({ completedSessions: 0, previousWeekVolume: 0, volumeChangePercent: null })
  expect(result.consistency.currentStreakWeeks).toBe(2)
})

it('normalizes session volume to the account display units', () => {
  const pounds = { ...session('lb', '2026-09-21T09:00:00Z', 220.46226218), units: 'lb' as const }
  const result = buildTodayHistorySupport({ sessions: [pounds, session('kg', '2026-09-21T09:00:00Z', 100)],
    hasCompletedSessions: true, displayUnits: 'kg', today: '2026-09-21', now: new Date('2026-09-21T12:00:00Z') })
  expect(result.calendarWeek?.volume).toBeCloseTo(1000, 1)
})
