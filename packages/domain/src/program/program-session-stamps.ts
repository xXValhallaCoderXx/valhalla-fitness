import type { HistorySessionInput } from '../history/history'
import type { ProgramSessionStamp } from './types'

/** Reuse the history already fetched by Plan, without issuing per-workout reads. */
export function buildProgramSessionStamps(
  sessions: HistorySessionInput[],
  programInstanceId: string,
): ProgramSessionStamp[] {
  return sessions
    .filter((session): session is HistorySessionInput & { weekIndex: number; completedAt: string } =>
      session.programInstanceId === programInstanceId
      && typeof session.weekIndex === 'number'
      && Number.isInteger(session.weekIndex)
      && session.weekIndex >= 0
      && Boolean(session.completedAt),
    )
    .map((session) => ({
      weekIndex: session.weekIndex,
      completedAt: session.completedAt,
      id: session.id,
      title: session.title,
      units: session.units ?? null,
      movementCount: session.movementCount,
      plannedSetCount: session.plannedSetCount,
      completedSetCount: session.exercises.reduce(
        (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
        0,
      ),
      mainTargets: session.exercises.filter((exercise) => exercise.role === 'main').map((exercise) => {
        const loads = exercise.sets.map((set) => set.targetLoad).filter(
          (load): load is number => typeof load === 'number' && Number.isFinite(load) && load >= 0,
        )
        return {
          plannedMovementId: exercise.plannedMovementId,
          performedMovementId: exercise.performedMovementId,
          targetLoad: loads.length ? Math.max(...loads) : null,
        }
      }),
    }))
}
