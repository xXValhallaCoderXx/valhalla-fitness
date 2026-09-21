import { useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { advanceAfterLog } from '@sheetless/domain/session/live-focus-utils'
import { parseSetInput, seedSetInput, setDraftId, type SetInput } from '@sheetless/domain/session/set-draft'
import { useFocusSetState } from '../focus/useFocusSetState'
import { useSetLogMutation } from '../focus/useSetLogMutation'
import { editSetDraft, hasNewerSetDraft, useWorkoutDrafts } from './workout-drafts'

export function useWorkoutLogger(user: User, session: WorkoutSession, movement: MovementSlot,
  onSelectMovement: (id: string | null) => void, busy: boolean) {
  const client = useQueryClient()
  const drafts = useWorkoutDrafts(user.id, session.sessionId)
  const selection = useFocusSetState(session.sessionId, movement)
  const navigationRevision = useRef(0)
  const set = movement.sets.find(item => item.setIndex === selection.selectedSetIndex) ?? movement.sets[0]
  const id = setDraftId(movement, set?.setIndex ?? 1)
  const stored = drafts.sets[id]
  const input = stored ?? (set ? seedSetInput(movement, set) : { load: '', reps: '', rir: null })
  const parsed = parseSetInput(input)
  const save = useSetLogMutation(user, session, movement, set?.setIndex ?? 1)
  const saving = save.isPending || set?.syncState === 'saving'
  const edit = (patch: Partial<SetInput>) => editSetDraft(client, user.id, session.sessionId, id, { ...input, ...patch })
  const selectSet = (index: number) => { navigationRevision.current++; selection.selectSet(index) }
  const selectMovement = (movementId: string | null) => { navigationRevision.current++; onSelectMovement(movementId) }
  const selectMovementSet = (movementId: string, index: number) => {
    const target = session.movements.find(item => item.id === movementId)
    if (!target) return
    selectMovement(movementId)
    selection.selectSet(index, target)
  }
  const submit = (completed = true, onSaved?: () => void) => {
    if (!set || (completed && !parsed) || busy || saving) return
    // Pin before the optimistic completion; changing views never changes this selection.
    selection.selectSet(set.setIndex)
    const navigation = navigationRevision.current
    const revision = stored?.revision ?? 0
    const values = parsed ?? { actualLoad: set.actualLoad ?? null, actualReps: set.actualReps ?? null, actualRir: set.actualRir ?? null }
    save.mutate({ ...values, completed, setIndex: set.setIndex, movementSlotId: movement.id }, {
      onSuccess: (next, _attempt, context) => {
        const newer = hasNewerSetDraft(client, user.id, session.sessionId, id, revision)
        if (!newer) onSaved?.()
        if (!completed || !context?.newCompletion || navigation !== navigationRevision.current
          || newer) return
        const target = advanceAfterLog(next, movement.id, set.setIndex)
        if (target.kind === 'sessionComplete') return
        if (target.movementId !== movement.id) onSelectMovement(target.movementId)
        else selection.selectSet(target.setIndex)
      },
    })
  }
  const failed = set?.syncState === 'syncFailed'
  const changed = parsed && (parsed.actualLoad !== set?.actualLoad || parsed.actualReps !== set?.actualReps
    || parsed.actualRir !== (set?.actualRir ?? null))
  const sameAttempt = save.variables?.movementSlotId === movement.id && save.variables.setIndex === set?.setIndex
  const alreadyConfirmed = sameAttempt && set?.clientMutationId === save.variables?.clientMutationId && set?.syncState === 'synced'
  const label = failed ? changed ? 'Save changes' : 'Retry save' : set?.completed ? 'Update set' : 'Log set'
  return { set, input, edit, submit, selectSet, selectMovement, selectMovementSet, saving, failed, label, valid: Boolean(parsed),
    disabled: busy || saving, error: sameAttempt && !alreadyConfirmed ? save.error : null, selectedSetIndex: set?.setIndex ?? 1 }
}
export type WorkoutLogger = ReturnType<typeof useWorkoutLogger>
