import { useQuery, type QueryClient } from '@tanstack/react-query'
import { parseSetInput, setDraftId, type SetInput, type SetInputDraft } from '@sheetless/domain/session/set-draft'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'

type Drafts = { revision: number; sets: Record<string, SetInputDraft> }
const EMPTY: Drafts = { revision: 0, sets: {} }
export const workoutDraftKey = (userId: string, sessionId: string) => ['account', userId, 'workout-drafts', sessionId] as const

export function useWorkoutDrafts(userId: string, sessionId: string) {
  return useQuery({ queryKey: workoutDraftKey(userId, sessionId), queryFn: () => EMPTY,
    initialData: EMPTY, enabled: false, gcTime: Infinity, staleTime: Infinity }).data
}

export function editSetDraft(client: QueryClient, userId: string, sessionId: string, id: string, input: SetInput) {
  client.setQueryDefaults(workoutDraftKey(userId, sessionId), { gcTime: Infinity })
  client.setQueryData<Drafts>(workoutDraftKey(userId, sessionId), (current = EMPTY) => ({
    revision: current.revision + 1,
    sets: { ...current.sets, [id]: { ...input, revision: current.revision + 1, submitted: current.sets[id]?.submitted } },
  }))
}

export function submittedSetDraft(client: QueryClient, userId: string, sessionId: string, id: string, mutationId: string, values?: { actualLoad?: number | null; actualReps?: number | null; actualRir?: number | null }) {
  client.setQueryData<Drafts>(workoutDraftKey(userId, sessionId), current => {
    const draft = current?.sets[id]
    if (!draft || !current) return current
    const parsed = parseSetInput(draft)
    if (values && (!parsed || parsed.actualLoad !== values.actualLoad || parsed.actualReps !== values.actualReps
      || parsed.actualRir !== (values.actualRir ?? null))) return current
    return { ...current, sets: { ...current.sets, [id]: { ...draft, submitted: { revision: draft.revision, mutationId } } } }
  })
}

/** Called with confirmed data only; fresh reads can acknowledge a lost response too. */
export function reconcileWorkoutDrafts(client: QueryClient, userId: string, session: WorkoutSession) {
  if (session.status !== 'in_progress') return clearWorkoutDrafts(client, userId, session.sessionId)
  client.setQueryData<Drafts>(workoutDraftKey(userId, session.sessionId), current => {
    if (!current) return current
    const sets = { ...current.sets }
    for (const movement of session.movements) for (const set of movement.sets) {
      const id = setDraftId(movement, set.setIndex)
      const draft = sets[id]
      if (draft?.submitted && draft.submitted.mutationId === set.clientMutationId && draft.submitted.revision === draft.revision
        && set.syncState !== 'saving' && set.syncState !== 'syncFailed') delete sets[id]
    }
    return Object.keys(sets).length === Object.keys(current.sets).length ? current : { ...current, sets }
  })
}

export function clearWorkoutDrafts(client: QueryClient, userId: string, sessionId: string, movementId?: string) {
  const key = workoutDraftKey(userId, sessionId)
  if (!movementId) { client.removeQueries({ queryKey: key }); return }
  client.setQueryData<Drafts>(key, current => current ? { ...current,
    sets: Object.fromEntries(Object.entries(current.sets).filter(([id]) => JSON.parse(id)[0] !== movementId)),
  } : current)
}

export function hasNewerSetDraft(client: QueryClient, userId: string, sessionId: string, id: string, revision: number) {
  const draft = client.getQueryData<Drafts>(workoutDraftKey(userId, sessionId))?.sets[id]
  return Boolean(draft && draft.revision > revision)
}
