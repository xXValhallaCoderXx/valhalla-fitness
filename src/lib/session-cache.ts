import type { SetLog, WorkoutSession } from '~/types/training'

export type SetPatch = Partial<
  Pick<
    SetLog,
    | 'actualLoad'
    | 'actualReps'
    | 'actualRir'
    | 'actualRpe'
    | 'completed'
    | 'note'
    | 'clientMutationId'
    | 'syncState'
  >
> & {
  exerciseLogId?: string
  movementSlotId?: string
  setId?: string
  setIndex: number
}

export function patchSetInSession(session: WorkoutSession, patch: SetPatch): WorkoutSession {
  return {
    ...session,
    syncState: patch.syncState === 'syncFailed' ? 'syncFailed' : session.syncState,
    movements: session.movements.map((movement) => {
      const matchesSlot =
        patch.movementSlotId === movement.id ||
        patch.exerciseLogId === movement.id ||
        movement.sets.some((set) => set.exerciseLogId === patch.exerciseLogId)
      if (!matchesSlot) return movement
      return {
        ...movement,
        sets: movement.sets.map((set) => {
          const matchesSet =
            set.setIndex === patch.setIndex ||
            (patch.setId ? set.id === patch.setId : false)
          return matchesSet ? { ...set, ...patch } : set
        }),
      }
    }),
  }
}

export function sessionCompletion(session: WorkoutSession) {
  const sets = session.movements.flatMap((movement) => movement.sets)
  const completed = sets.filter((set) => set.completed).length
  return {
    completed,
    total: sets.length,
    percent: sets.length ? Math.round((completed / sets.length) * 100) : 0,
  }
}
