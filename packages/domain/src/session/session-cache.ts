import type { SetLog, WorkoutSession } from '@sheetless/domain/session/types'

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

/** Retain in-memory edits until the server returns their exact mutation receipt. */
export function reconcileSessionSets(
  current: WorkoutSession | undefined,
  incoming: WorkoutSession,
): WorkoutSession {
  if (!current || current.sessionId !== incoming.sessionId || incoming.status !== 'in_progress') return incoming
  let next = incoming
  for (const movement of current.movements) {
    const serverMovement = incoming.movements.find((item) => item.id === movement.id)
    for (const set of movement.sets) {
      if (set.syncState !== 'saving' && set.syncState !== 'syncFailed') continue
      const serverSet = serverMovement?.sets.find((item) => item.setIndex === set.setIndex)
      if (!serverSet || (set.clientMutationId && set.clientMutationId === serverSet.clientMutationId)) continue
      next = patchSetInSession(next, { ...set, movementSlotId: movement.id })
    }
  }
  return next
}

export function hasUnsettledSessionSets(session: WorkoutSession): boolean {
  return session.movements.some((movement) => movement.sets.some(
    (set) => set.syncState === 'saving' || set.syncState === 'syncFailed',
  ))
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

export function patchMovementInSession(
  session: WorkoutSession,
  patch: {
    exerciseLogId: string
    performedMovementId: string
    performedMovementName: string
    syncState?: WorkoutSession['syncState']
  },
): WorkoutSession {
  return {
    ...session,
    syncState: patch.syncState === 'syncFailed' ? 'syncFailed' : session.syncState,
    movements: session.movements.map((movement) => {
      if (movement.id !== patch.exerciseLogId) return movement
      return {
        ...movement,
        performedMovementId: patch.performedMovementId,
        performedMovementName: patch.performedMovementName,
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
