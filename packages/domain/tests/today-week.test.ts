import { describe, expect, it } from 'vitest'
import { buildTodayWeek, sessionIndexInWeek } from '@sheetless/domain/session/today-week'
import type { TemplateDefinition } from '@sheetless/domain/program/types'

function definition(over: Partial<TemplateDefinition> = {}): TemplateDefinition {
  return {
    schemaVersion: '2026.06.dsl',
    id: 'tpl',
    name: 'Training Max Wave',
    durationWeeks: 4,
    daysPerWeek: 3,
    requiredState: [],
    timelineDescription: '',
    sessions: [
      { id: 'day-1', title: 'Squat day', estimatedMinutes: 60, slots: [] },
      { id: 'day-2', title: 'Bench day', estimatedMinutes: 55, slots: [] },
      { id: 'day-3', title: 'Deadlift day', estimatedMinutes: 75, slots: [] },
    ],
    weeks: [
      { label: '5s week', phaseKey: 'p', phaseLabel: 'Base', summary: '', hardness: 'Medium', prescriptions: {} },
      { label: '3s week', phaseKey: 'p', phaseLabel: 'Build', summary: '', hardness: 'Hard', prescriptions: {} },
      { label: 'Peak week', phaseKey: 'p', phaseLabel: 'Peak', summary: '', hardness: 'Hard', prescriptions: {} },
      { label: 'Deload', phaseKey: 'd', phaseLabel: 'Deload', summary: '', hardness: 'Deload', prescriptions: {} },
    ],
    ...over,
  }
}

describe('sessionIndexInWeek', () => {
  it('wraps the global session counter into the week', () => {
    expect(sessionIndexInWeek(0, 3)).toBe(0)
    expect(sessionIndexInWeek(4, 3)).toBe(1)
    expect(sessionIndexInWeek(9, 3)).toBe(0)
  })

  it('stays in range for a negative or unusable counter', () => {
    expect(sessionIndexInWeek(-1, 3)).toBe(2)
    expect(sessionIndexInWeek(Number.NaN, 3)).toBe(0)
    expect(sessionIndexInWeek(5, 0)).toBe(0)
  })
})

describe('buildTodayWeek', () => {
  it('places today inside the week and marks earlier sessions done', () => {
    // 7 completed sessions of a 3-day week: week 3 (index 2), session 2 of 3.
    const week = buildTodayWeek({ currentWeekIndex: 7 }, definition())

    expect(week).toMatchObject({
      weekNumber: 3,
      totalWeeks: 4,
      phaseLabel: 'Peak',
      sessionNumber: 2,
      daysPerWeek: 3,
      sessionsDone: 1,
    })
    expect(week?.sessions.map((session) => session.status)).toEqual(['done', 'next', 'upcoming'])
    expect(week?.sessions.map((session) => session.title)).toEqual(['Squat day', 'Bench day', 'Deadlift day'])
  })

  it('counts movements and the current week\u2019s planned sets per session', () => {
    const withSlots = definition({
      sessions: [
        {
          id: 'day-1',
          title: 'Squat day',
          estimatedMinutes: 60,
          slots: [
            { id: 'main', role: 'main', movementId: 'squat', prescriptionId: 'p-main' },
            { id: 'acc', role: 'accessory', movementId: 'leg_curl', prescriptionId: 'p-acc' },
          ],
        },
      ],
      daysPerWeek: 1,
      weeks: [
        {
          label: 'Week 1',
          phaseKey: 'p',
          phaseLabel: 'Base',
          summary: '',
          hardness: 'Medium',
          prescriptions: {
            'p-main': { targetSummary: '3x5', sets: [{ targetReps: 5 }, { targetReps: 5 }, { targetReps: 5 }] },
            'p-acc': { targetSummary: '2x10', sets: [{ targetReps: 10 }, { targetReps: 10 }] },
          },
        },
      ],
      durationWeeks: 1,
    })

    const [session] = buildTodayWeek({ currentWeekIndex: 0 }, withSlots)!.sessions
    expect(session.movementCount).toBe(2)
    expect(session.setCount).toBe(5)
  })

  it('reports zero sets when the week has no matching prescriptions', () => {
    const orphan = definition({
      sessions: [
        { id: 'day-1', title: 'Squat day', estimatedMinutes: 60, slots: [{ id: 'main', role: 'main', movementId: 'squat', prescriptionId: 'missing' }] },
      ],
      daysPerWeek: 1,
      durationWeeks: 1,
      weeks: [{ label: 'Week 1', phaseKey: 'p', phaseLabel: 'Base', summary: '', hardness: 'Medium', prescriptions: {} }],
    })
    expect(buildTodayWeek({ currentWeekIndex: 0 }, orphan)!.sessions[0].setCount).toBe(0)
  })

  it('starts a fresh programme on session 1 with nothing done', () => {
    const week = buildTodayWeek({ currentWeekIndex: 0 }, definition())
    expect(week).toMatchObject({ weekNumber: 1, sessionNumber: 1, sessionsDone: 0, phaseLabel: 'Base' })
    expect(week?.sessions.every((session, index) => session.status === (index ? 'upcoming' : 'next'))).toBe(true)
  })

  it('clamps a programme that has run past the end of its cycle', () => {
    // 3 weeks of 3 + 1: week index wraps rather than overflowing the weeks array.
    const week = buildTodayWeek({ currentWeekIndex: 13 }, definition())
    expect(week?.weekNumber).toBe(1)
    expect(week?.sessionNumber).toBe(2)
  })

  it('handles a one-session week', () => {
    const week = buildTodayWeek({ currentWeekIndex: 5 }, definition({ daysPerWeek: 1 }))
    expect(week).toMatchObject({ sessionNumber: 1, sessionsDone: 0, daysPerWeek: 1 })
    expect(week?.sessions).toHaveLength(1)
  })

  it('returns null for a definition that cannot describe a week', () => {
    expect(buildTodayWeek({ currentWeekIndex: 0 }, definition({ daysPerWeek: 0 }))).toBeNull()
    expect(buildTodayWeek({ currentWeekIndex: 0 }, definition({ durationWeeks: 0 }))).toBeNull()
  })
})

describe('Today header dates', () => {
  it('writes the eyebrow and the last-session date day-first', async () => {
    const { formatWeekdayLongDate, formatWeekdayShortDate } = await import('@sheetless/domain/shared/dates')
    expect(formatWeekdayLongDate('2026-08-07')).toBe('Friday 7 August')
    expect(formatWeekdayShortDate('2026-08-06')).toBe('Thu 6 Aug')
    expect(formatWeekdayLongDate(null)).toBe('—')
    expect(formatWeekdayShortDate('nonsense')).toBe('—')
  })
})

describe('viewing another week of the cycle', () => {
  it('marks a past week finished, with no "next" session', () => {
    // 7 completed sessions of a 3-day week: the programme is on week 3, so week 1 is behind it.
    const week = buildTodayWeek({ currentWeekIndex: 7 }, definition(), 0)
    expect(week).toMatchObject({ weekNumber: 1, weekIndex: 0, isCurrent: false, sessionsDone: 3 })
    expect(week?.sessions.every((session) => session.status === 'done')).toBe(true)
  })

  it('marks a future week untouched', () => {
    const week = buildTodayWeek({ currentWeekIndex: 7 }, definition(), 3)
    expect(week).toMatchObject({ weekNumber: 4, isCurrent: false, sessionsDone: 0 })
    expect(week?.sessions.every((session) => session.status === 'upcoming')).toBe(true)
  })

  it('addresses sessions from the start of the cycle the programme is in', () => {
    // Second cycle of a 4-week × 3-day programme starts at global index 12.
    const week = buildTodayWeek({ currentWeekIndex: 13 }, definition(), 0)
    expect(week?.firstGlobalIndex).toBe(12)
    expect(week?.sessions.map((session) => session.globalIndex)).toEqual([12, 13, 14])
  })

  it('keeps the current week unchanged when no override is given', () => {
    const plain = buildTodayWeek({ currentWeekIndex: 7 }, definition())
    expect(plain).toMatchObject({ weekNumber: 3, isCurrent: true, sessionsDone: 1 })
    expect(plain?.sessions.map((session) => session.status)).toEqual(['done', 'next', 'upcoming'])
  })

  it('clamps an out-of-range week rather than reading past the definition', () => {
    expect(buildTodayWeek({ currentWeekIndex: 0 }, definition(), 99)?.weekNumber).toBe(4)
    expect(buildTodayWeek({ currentWeekIndex: 0 }, definition(), -5)?.weekNumber).toBe(1)
  })
})
