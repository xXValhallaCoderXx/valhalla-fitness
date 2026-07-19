import type { TodayResponse } from '@sheetless/api'
import { resolveTodayState } from '@/features/today/today-state'

const active = { sessionId: 'a', title: 'Active', programTitle: 'Plan', weekLabel: 'Week 1', completedSets: 1, totalSets: 5 }
const planned = { id: 'p', title: 'Planned', programTitle: 'Plan', weekLabel: 'Week 1', estimatedMinutes: 45, movementCount: 3, setCount: 10, units: 'kg' as const }
const completed = { sessionId: 'c', title: 'Done', programTitle: 'Plan', weekLabel: 'Week 1', completedSets: 5, totalSets: 5, completedAt: null }

function today(patch: Partial<TodayResponse> = {}): TodayResponse {
  return { activeSession: null, plannedSession: null, completedSession: null, hasActiveProgram: true, pendingDecisionCount: 0, ...patch }
}

describe('Today precedence', () => {
  it('prioritizes active, blocked, planned, then completed', () => {
    expect(resolveTodayState(today({ activeSession: active, pendingDecisionCount: 2, plannedSession: planned })).kind).toBe('active')
    expect(resolveTodayState(today({ pendingDecisionCount: 2, plannedSession: planned })).kind).toBe('blocked')
    expect(resolveTodayState(today({ plannedSession: planned, completedSession: completed })).kind).toBe('planned')
    expect(resolveTodayState(today({ completedSession: completed })).kind).toBe('completed')
  })

  it('distinguishes no-program and empty-program states', () => {
    expect(resolveTodayState(today({ hasActiveProgram: false })).kind).toBe('noProgram')
    expect(resolveTodayState(today()).kind).toBe('empty')
  })
})
