import { useLayoutEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { changeProgramReturn, returnChangeInput } from '@sheetless/data/program/return-guide'
import type { ProgramLoadChange, ReturnSettings } from '@sheetless/domain/program/types'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { invalidateProgramStateBestEffort } from '../program-cache'
import type { ReturnGuideDraft, ReturnGuideState } from './useReturnGuideDraft'

type ReturnAction = 'apply' | 'update' | 'extend' | 'end'
type ReturnIntent = { user: User; state: ReturnGuideState; action: ReturnAction; settings: ReturnSettings;
  changes: ProgramLoadChange[]; valid: boolean; editing: boolean; requestId: string }

export function useReturnGuideMutation(user: User, draft: ReturnGuideDraft, onClose: () => void) {
  const client = useQueryClient()
  const account = useRef<string | null>(user.id)
  useLayoutEffect(() => {
    account.current = user.id
    return () => { account.current = null }
  }, [user.id])
  const request = useStableMutationRequest()
  const mutation = useMutation({
    mutationKey: ['changeProgramReturn', user.id, draft.program.id],
    mutationFn: (intent: ReturnIntent) => {
      const { state, action, editing, settings, changes, valid } = intent
      if (state.hasActiveSession) throw new Error('Finish or discard your active workout before changing the guide.')
      if (editing && state.pendingDecisionIds.length) throw new Error('Resolve outstanding progression recommendations before changing the guide.')
      if (action !== 'end' && !valid) throw new Error('Check the return settings before continuing.')
      return changeProgramReturn(buildUserContext(intent.user), returnChangeInput(state, settings,
        changes, action, intent.requestId))
    },
    onSuccess: async (_result, intent) => {
      if (account.current !== intent.user.id) return
      request.clearRequest(intent.requestId)
      await invalidateProgramStateBestEffort(client, intent.user.id)
      if (account.current === intent.user.id) onClose()
    },
  })
  return { ...mutation, mutate: (action: ReturnAction) => {
    if (mutation.isPending) return
    const { state, preview, editing, program } = draft
    const settings = action === 'end' ? program.returnPeriod!.settings : preview.settings
    const changes = action === 'end' ? [] : preview.changes
    const fingerprint = { userId: user.id, programId: program.id, expectedVersion: program.stateVersion,
      action, settings, changes, pendingDecisionIds: state.pendingDecisionIds }
    mutation.mutate({ user, state, action, settings, changes, editing, valid: draft.valid,
      requestId: request.requestIdFor(fingerprint) })
  } }
}
