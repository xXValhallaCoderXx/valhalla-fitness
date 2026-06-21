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
  it('moves Bullmastiff from completed squat day to bench day', () => {
    const nextProgram = programForNextUncompletedSession(program, ['bull-squat-w1'], '2026-06-21')
    const nextSession = expandPlannedSession(nextProgram, '2026-06-21')

    expect(nextProgram.currentWeekIndex).toBe(1)
    expect(nextSession.title).toBe('Bullmastiff Bench')
    expect(nextSession.movements[0]?.movementName).toBe('Bench Press')
  })

  it('does not advance when the current planned day has not been completed', () => {
    const nextProgram = programForNextUncompletedSession(program, ['bull-bench-w2'], '2026-06-21')
    const nextSession = expandPlannedSession(nextProgram, '2026-06-21')

    expect(nextProgram.currentWeekIndex).toBe(0)
    expect(nextSession.title).toBe('Bullmastiff Squat')
  })
})