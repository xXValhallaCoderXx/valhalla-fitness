import { describe, expect, it } from 'vitest'
import type { PlannedSession, TodayPayload, WorkoutSession } from '../src/shared/types'
import { toNativeToday } from '../src/domains/session/server/mobile-dto'

const planned: PlannedSession = {
  id: 'day-a-w1',
  title: 'Day A',
  programTitle: 'Linear Strength',
  templateId: 'linear',
  weekIndex: 0,
  weekLabel: 'Week 1',
  hardness: 'Medium',
  scheduledDate: '2026-07-18',
  estimatedMinutes: 45,
  units: 'kg',
  rounding: 2.5,
  movements: [
    {
      id: 'squat-slot',
      movementId: 'squat',
      movementName: 'Squat',
      role: 'main',
      orderIndex: 0,
      targetSummary: '3 × 5',
      sets: [
        { id: 'set-1', setIndex: 1, completed: true },
        { id: 'set-2', setIndex: 2, completed: false },
      ],
    },
  ],
}

function workout(id: string, status: WorkoutSession['status']): WorkoutSession {
  return {
    ...planned,
    movements: planned.movements.map((movement) => ({
      ...movement,
      sets: movement.sets.map((set) => ({ ...set })),
    })),
    sessionId: id,
    status,
    completedAt: status === 'completed' ? '2026-07-18T10:00:00.000Z' : null,
  }
}

describe('native Today DTO', () => {
  it('maps every card to a compact response without leaking the template definition', () => {
    const result = toNativeToday({
      activeProgram: { id: 'program' } as TodayPayload['activeProgram'],
      activeSession: workout('11111111-1111-4111-8111-111111111111', 'in_progress'),
      plannedSession: planned,
      completedSession: workout('22222222-2222-4222-8222-222222222222', 'completed'),
      pendingDecisions: [{ id: 'a' }, { id: 'b' }] as TodayPayload['pendingDecisions'],
    })

    expect(result).toMatchObject({
      hasActiveProgram: true,
      pendingDecisionCount: 2,
      activeSession: { completedSets: 1, totalSets: 2 },
      plannedSession: { movementCount: 1, setCount: 2 },
      completedSession: { completedAt: '2026-07-18T10:00:00.000Z' },
    })
    expect(result.plannedSession).not.toHaveProperty('movements')
    expect(result).not.toHaveProperty('activeProgram')
  })

  it('represents no-program and no-session state explicitly', () => {
    expect(toNativeToday({
      activeProgram: null,
      activeSession: null,
      plannedSession: null,
      completedSession: null,
      pendingDecisions: [],
    })).toEqual({
      activeSession: null,
      plannedSession: null,
      completedSession: null,
      hasActiveProgram: false,
      pendingDecisionCount: 0,
    })
  })
})
