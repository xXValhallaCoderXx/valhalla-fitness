import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import type { FocusSetMemory, FocusSetStore } from '../focus/useFocusSetState'
import { workoutMemoryKey } from '../focus/workout-drafts'

type WorkoutNavigation = {
  mode: 'overview' | 'focus'
  activeMovementId: string | null
  notes: string | null
  focus: FocusSetMemory
}

/** Route-local UI can remount; account/session memory retains the exact reading and editing place. */
export function useWorkoutNavigation(userId: string, session: WorkoutSession) {
  const client = useQueryClient()
  const queryKey = [...workoutMemoryKey(userId, session.sessionId), 'navigation']
  const { data } = useQuery<WorkoutNavigation>({
    queryKey, queryFn: () => { throw new Error('Workout navigation is memory only') },
    enabled: false, gcTime: Infinity,
    initialData: () => {
      const ordered = [...session.movements].sort((left, right) => left.orderIndex - right.orderIndex)
      return {
        mode: ordered.length ? 'focus' : 'overview',
        activeMovementId: ordered.find((movement) => movement.sets.some((set) => !set.completed))?.id ?? ordered[0]?.id ?? null,
        notes: null, focus: { selected: {}, suggestions: {} },
      }
    },
  })
  const update = (change: (current: WorkoutNavigation) => WorkoutNavigation) =>
    client.setQueryData<WorkoutNavigation>(queryKey, (current) => current ? change(current) : current)
  const focusStore: FocusSetStore = {
    value: data.focus,
    update: (change) => update((current) => ({ ...current, focus: change(current.focus) })),
  }
  return {
    ...data, notes: data.notes ?? session.notes ?? '', focusStore,
    setMode: (mode: WorkoutNavigation['mode']) => update((current) => ({ ...current, mode })),
    setActiveMovementId: (activeMovementId: string | null) => update((current) => ({ ...current, activeMovementId })),
    setNotes: (notes: string) => update((current) => ({ ...current, notes })),
  }
}
