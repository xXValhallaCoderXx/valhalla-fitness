import { describe, expect, it } from 'vitest'
import { patchMovementInSession, patchSetInSession, sessionCompletion } from '../src/domains/session/lib/session-cache'
import type { WorkoutSession } from '../src/shared/types'

const session: WorkoutSession = {
  sessionId: 'session-1',
  id: 'planned-1',
  title: 'Deadlift',
  programTitle: 'Training Max Wave',
  templateId: 'healthy-531-fsl',
  weekIndex: 0,
  weekLabel: 'Week 1',
  hardness: 'Medium',
  scheduledDate: '2026-06-21',
  estimatedMinutes: 75,
  units: 'kg',
  rounding: 2.5,
  status: 'in_progress',
  movements: [
    {
      id: 'exercise-1',
      movementId: 'deadlift',
      movementName: 'Deadlift',
      role: 'main',
      orderIndex: 1,
      targetSummary: 'main',
      sets: [
        {
          id: 'set-1',
          setIndex: 1,
          targetLoad: 120,
          targetReps: 5,
          completed: false,
        },
      ],
    },
  ],
}

describe('session cache helpers', () => {
  it('patches a set without changing the rest of the session', () => {
    const next = patchSetInSession(session, {
      movementSlotId: 'exercise-1',
      setIndex: 1,
      actualLoad: 125,
      actualReps: 6,
      completed: true,
      syncState: 'saving',
    })

    expect(next.movements[0].sets[0].actualLoad).toBe(125)
    expect(next.movements[0].sets[0].completed).toBe(true)
    expect(session.movements[0].sets[0].completed).toBe(false)
  })

  it('computes completion', () => {
    const next = patchSetInSession(session, {
      movementSlotId: 'exercise-1',
      setIndex: 1,
      completed: true,
    })
    expect(sessionCompletion(next)).toEqual({ completed: 1, total: 1, percent: 100 })
  })

  it('patches a performed movement without changing logged sets', () => {
    const next = patchMovementInSession(session, {
      exerciseLogId: 'exercise-1',
      performedMovementId: 'romanian_deadlift',
      performedMovementName: 'Romanian Deadlift',
    })

    expect(next.movements[0].movementName).toBe('Deadlift')
    expect(next.movements[0].performedMovementName).toBe('Romanian Deadlift')
    expect(next.movements[0].sets).toBe(session.movements[0].sets)
  })
})
