import type { WorkoutSession } from '~/shared/types'

export function countCompletedSets(session: WorkoutSession) {
  return session.movements.reduce((total, movement) => total + movement.sets.filter((set) => set.completed).length, 0)
}

export function nextIncompleteSetLabel(session: WorkoutSession) {
  const movement = session.movements.find((item) => item.sets.some((set) => !set.completed))
  const set = movement?.sets.find((item) => !item.completed)
  if (!movement || !set) return null
  return `${movement.movementName} · set ${set.setIndex}`
}

export function isMeaningfulSyncState(state?: string) {
  return state === 'saving' || state === 'syncFailed'
}
