import type { TodayResponse } from '@sheetless/api'

export type TodayState =
  | { kind: 'active'; session: NonNullable<TodayResponse['activeSession']> }
  | { kind: 'blocked'; pendingDecisionCount: number }
  | { kind: 'planned'; session: NonNullable<TodayResponse['plannedSession']> }
  | { kind: 'completed'; session: NonNullable<TodayResponse['completedSession']> }
  | { kind: 'noProgram' }
  | { kind: 'empty' }

export function resolveTodayState(today: TodayResponse): TodayState {
  if (today.activeSession) return { kind: 'active', session: today.activeSession }
  if (today.pendingDecisionCount > 0) {
    return { kind: 'blocked', pendingDecisionCount: today.pendingDecisionCount }
  }
  if (today.plannedSession) return { kind: 'planned', session: today.plannedSession }
  if (today.completedSession) return { kind: 'completed', session: today.completedSession }
  if (!today.hasActiveProgram) return { kind: 'noProgram' }
  return { kind: 'empty' }
}
