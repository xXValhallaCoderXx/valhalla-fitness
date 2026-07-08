import { describe, expect, it } from 'vitest'
import { buildConsistency, buildWeeklySessionCounts, streakBadgeLabel } from '../src/domains/history/lib/consistency'
import type { HistorySessionInput } from '../src/domains/history/lib/history'
import type { WeeklyCount } from '../src/shared/types'

function makeSession(overrides: Partial<HistorySessionInput> = {}): HistorySessionInput {
  return {
    id: 'session-1',
    plannedSessionId: null,
    title: 'Session',
    scheduledDate: '2026-06-01',
    completedAt: '2026-06-01T10:00:00.000Z',
    units: 'kg',
    movementCount: 0,
    plannedSetCount: 0,
    exercises: [],
    ...overrides,
  }
}

function makeWeekly(counts: number[]): WeeklyCount[] {
  return counts.map((sessionCount, index) => {
    const weekStart = new Date(Date.UTC(2026, 5, 1 + index * 7))
    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      weekLabel: `Jun ${weekStart.getUTCDate()}`,
      sessionCount,
    }
  })
}

describe('buildWeeklySessionCounts', () => {
  it('zero-fills gap weeks between the first session week and the week containing now', () => {
    const sessions = [
      makeSession({ id: 'b', completedAt: '2026-06-24T10:00:00.000Z', scheduledDate: '2026-06-24' }),
      makeSession({ id: 'a', completedAt: '2026-06-03T10:00:00.000Z', scheduledDate: '2026-06-03' }),
    ]
    const weekly = buildWeeklySessionCounts(sessions, '2026-06-25T12:00:00.000Z')

    expect(weekly).toEqual([
      { weekStart: '2026-06-01', weekLabel: 'Jun 1', sessionCount: 1 },
      { weekStart: '2026-06-08', weekLabel: 'Jun 8', sessionCount: 0 },
      { weekStart: '2026-06-15', weekLabel: 'Jun 15', sessionCount: 0 },
      { weekStart: '2026-06-22', weekLabel: 'Jun 22', sessionCount: 1 },
    ])
  })

  it('extends zero-filled weeks up to now even when no sessions are recent', () => {
    const sessions = [makeSession({ completedAt: '2026-06-02T10:00:00.000Z' })]
    const weekly = buildWeeklySessionCounts(sessions, '2026-06-16T00:00:00.000Z')

    expect(weekly.map((week) => week.weekStart)).toEqual(['2026-06-01', '2026-06-08', '2026-06-15'])
    expect(weekly.map((week) => week.sessionCount)).toEqual([1, 0, 0])
  })

  it('counts multiple sessions in the same week and falls back to scheduledDate', () => {
    const sessions = [
      makeSession({ id: 'c', completedAt: null, scheduledDate: '2026-06-05' }),
      makeSession({ id: 'b', completedAt: '2026-06-04T10:00:00.000Z' }),
      makeSession({ id: 'a', completedAt: '2026-06-01T10:00:00.000Z' }),
    ]
    const weekly = buildWeeklySessionCounts(sessions, '2026-06-06T12:00:00.000Z')

    expect(weekly).toHaveLength(1)
    expect(weekly[0]).toMatchObject({ weekStart: '2026-06-01', sessionCount: 3 })
  })

  it('returns [] for empty sessions', () => {
    expect(buildWeeklySessionCounts([], '2026-06-25T12:00:00.000Z')).toEqual([])
  })
})

describe('buildConsistency', () => {
  it('computes the longest streak across a single empty gap week', () => {
    const summary = buildConsistency(makeWeekly([1, 1, 0, 1, 1, 1]))

    expect(summary.longestStreakWeeks).toBe(3)
    expect(summary.currentStreakWeeks).toBe(3)
    expect(summary.weeksTrained).toBe(5)
    expect(summary.totalWeeks).toBe(6)
    expect(summary.percentWeeksTrained).toBe(83)
  })

  it('does not break the current streak on an empty in-progress current week', () => {
    const summary = buildConsistency(makeWeekly([1, 1, 1, 0]))

    expect(summary.currentStreakWeeks).toBe(3)
    expect(summary.longestStreakWeeks).toBe(3)
  })

  it('reports a current streak of 0 when the last two weeks are empty', () => {
    const summary = buildConsistency(makeWeekly([1, 1, 0, 0]))

    expect(summary.currentStreakWeeks).toBe(0)
    expect(summary.longestStreakWeeks).toBe(2)
  })

  it('handles a single trained week', () => {
    const summary = buildConsistency(makeWeekly([1]))

    expect(summary).toEqual({
      avgSessionsPerWeek: 1,
      longestStreakWeeks: 1,
      currentStreakWeeks: 1,
      weeksTrained: 1,
      totalWeeks: 1,
      percentWeeksTrained: 100,
    })
  })

  it('returns zeros and nulls for empty input', () => {
    expect(buildConsistency([])).toEqual({
      avgSessionsPerWeek: null,
      longestStreakWeeks: 0,
      currentStreakWeeks: 0,
      weeksTrained: 0,
      totalWeeks: 0,
      percentWeeksTrained: null,
    })
  })

  it('rounds average sessions per week to one decimal', () => {
    const summary = buildConsistency(makeWeekly([3, 2, 2]))

    expect(summary.avgSessionsPerWeek).toBe(2.3)
  })
})

describe('streakBadgeLabel', () => {
  it('hides sub-two-week streaks instead of shaming a fresh start', () => {
    expect(streakBadgeLabel(buildConsistency(makeWeekly([])))).toBeNull()
    expect(streakBadgeLabel(buildConsistency(makeWeekly([2])))).toBeNull()
    expect(streakBadgeLabel(buildConsistency(makeWeekly([2, 0, 3])))).toBeNull()
    expect(streakBadgeLabel(null)).toBeNull()
    expect(streakBadgeLabel(undefined)).toBeNull()
  })

  it('celebrates streaks of two weeks and up', () => {
    expect(streakBadgeLabel(buildConsistency(makeWeekly([1, 2])))).toBe('2-week streak 🔥')
    expect(streakBadgeLabel(buildConsistency(makeWeekly([2, 1, 3])))).toBe('3-week streak 🔥')
  })

  it('does not let an empty in-progress week break the celebrated streak', () => {
    expect(streakBadgeLabel(buildConsistency(makeWeekly([2, 3, 0])))).toBe('2-week streak 🔥')
  })
})
