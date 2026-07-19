import type { TodayResponse } from '@sheetless/api'
import type { TodayPayload, WorkoutSession } from '~/shared/types'

function completion(session: WorkoutSession) {
  const sets = session.movements.flatMap((movement) => movement.sets)
  return {
    completedSets: sets.filter((set) => set.completed).length,
    totalSets: sets.length,
  }
}

function sessionCard(session: WorkoutSession) {
  return {
    sessionId: session.sessionId,
    title: session.title,
    programTitle: session.programTitle,
    weekLabel: session.weekLabel,
    ...completion(session),
  }
}

export function toNativeToday(payload: TodayPayload): TodayResponse {
  return {
    activeSession: payload.activeSession ? sessionCard(payload.activeSession) : null,
    plannedSession: payload.plannedSession
      ? {
          id: payload.plannedSession.id,
          title: payload.plannedSession.title,
          programTitle: payload.plannedSession.programTitle,
          weekLabel: payload.plannedSession.weekLabel,
          estimatedMinutes: payload.plannedSession.estimatedMinutes,
          movementCount: payload.plannedSession.movements.length,
          setCount: payload.plannedSession.movements.reduce(
            (count, movement) => count + movement.sets.length,
            0,
          ),
          units: payload.plannedSession.units,
        }
      : null,
    completedSession: payload.completedSession
      ? {
          ...sessionCard(payload.completedSession),
          completedAt: payload.completedSession.completedAt ?? null,
        }
      : null,
    hasActiveProgram: Boolean(payload.activeProgram),
    pendingDecisionCount: payload.pendingDecisions.length,
  }
}
