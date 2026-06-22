import { describe, expect, it } from 'vitest'
import { expandPlannedSession, programForNextUncompletedSession } from '../src/lib/templates'
import type { ProgramInstance } from '../src/types/training'

const program: ProgramInstance = {
  id: 'program-1',
  templateId: 'bromley-bullmastiff',
  templateVersionId: 'template-version-1',
  title: 'Bromley Bullmastiff',
  status: 'active',
  startDate: '2026-06-21',
  units: 'kg',
  rounding: 2.5,
  currentWeekIndex: 0,
  anchors: [
    { movementId: 'squat', anchorType: 'training_max', value: 165 },
    { movementId: 'bench_press', anchorType: 'training_max', value: 110 },
    { movementId: 'deadlift', anchorType: 'training_max', value: 190 },
    { movementId: 'overhead_press', anchorType: 'training_max', value: 75 },
  ],
}

describe('planned session progression', () => {
  it('keeps 5/3/1 prescriptions on the same cycle week for all four weekly sessions', () => {
    const healthyProgram: ProgramInstance = { ...program, templateId: 'healthy-531-fsl' }
    const sessions = [0, 1, 2, 3].map((currentWeekIndex) =>
      expandPlannedSession({ ...healthyProgram, currentWeekIndex }, '2026-06-21'),
    )

    expect(sessions.map((session) => session.id)).toEqual([
      'squat-day-w1',
      'bench-day-w1',
      'deadlift-day-w1',
      'press-day-w1',
    ])
    expect(sessions.every((session) => session.movements[0]?.sets.find((set) => set.isAmrap)?.targetReps === 5)).toBe(true)
  })

  it('moves 5/3/1 into week two after all four weekly sessions', () => {
    const healthyProgram: ProgramInstance = { ...program, templateId: 'healthy-531-fsl', currentWeekIndex: 4 }
    const nextSession = expandPlannedSession(healthyProgram, '2026-06-21')

    expect(nextSession.id).toBe('squat-day-w2')
    expect(nextSession.movements[0]?.sets.find((set) => set.isAmrap)?.targetReps).toBe(3)
  })

  it('moves Bullmastiff from completed squat day to bench day', () => {
    const nextProgram = programForNextUncompletedSession(program, ['bull-squat-w1'], '2026-06-21')
    const nextSession = expandPlannedSession(nextProgram, '2026-06-21')

    expect(nextProgram.currentWeekIndex).toBe(1)
    expect(nextSession.title).toBe('Bullmastiff Bench')
    expect(nextSession.movements[0]?.movementName).toBe('Bench Press')
    expect(nextSession.id).toBe('bull-bench-w1')
    expect(nextSession.movements[0]?.sets.at(-1)?.targetReps).toBe(6)
  })

  it('keeps Bullmastiff prescriptions on the same programme week for all four weekly sessions', () => {
    const sessions = [0, 1, 2, 3].map((currentWeekIndex) =>
      expandPlannedSession({ ...program, currentWeekIndex }, '2026-06-21'),
    )

    expect(sessions.map((session) => session.id)).toEqual([
      'bull-squat-w1',
      'bull-bench-w1',
      'bull-deadlift-w1',
      'bull-press-w1',
    ])
    expect(sessions.every((session) => session.movements[0]?.sets.at(-1)?.targetReps === 6)).toBe(true)
  })

  it('moves Bullmastiff into peak prescriptions after the 9-week base phase', () => {
    const peakSession = expandPlannedSession({ ...program, currentWeekIndex: 36 }, '2026-06-21')

    expect(peakSession.weekLabel).toContain('Peak Wave 1')
    expect(peakSession.movements[0]?.sets).toHaveLength(5)
    expect(peakSession.movements[0]?.sets.at(-1)?.targetReps).toBe(3)
    expect(peakSession.movements[1]?.movementName).toBe('Pause Squat')
  })

  it('does not advance when the current planned day has not been completed', () => {
    const nextProgram = programForNextUncompletedSession(program, ['bull-bench-w2'], '2026-06-21')
    const nextSession = expandPlannedSession(nextProgram, '2026-06-21')

    expect(nextProgram.currentWeekIndex).toBe(0)
    expect(nextSession.title).toBe('Bullmastiff Squat')
  })
})