import { useEffect, useRef } from 'react'
import type { z } from 'zod'
import type { repeatCycleInputSchema } from '@sheetless/domain/program/cycle-schemas'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { ProgramCycleBoundary } from '@sheetless/domain/program/cycle-boundary'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { endCycleProgramFn, getCycleReviewFn, repeatProgramCycleFn } from '../../server/program-cycle-functions'
import { useStableProgramMutationRequest } from '../../lib/useStableProgramMutationRequest'

export function useCycleChoice(userId: string, boundary: ProgramCycleBoundary, onClose: () => void) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const request = useStableProgramMutationRequest()
  const identity = useRef<string | null>(null)
  useEffect(() => {
    identity.current = `${userId}:${boundary.id}`
    return () => { identity.current = null }
  }, [userId, boundary.id])
  const query = useQuery({
    queryKey: [...accountQueryKeys.program(userId), 'cycle', boundary.id],
    queryFn: () => getCycleReviewFn({ data: { programId: boundary.programId, boundaryId: boundary.id } }),
    staleTime: 0, refetchOnMount: 'always' as const,
  })
  type Intent = { action: 'repeat' | 'end'; data: z.infer<typeof repeatCycleInputSchema> }
  const mutation = useMutation({
    mutationFn: async (intent: Intent) => intent.action === 'repeat'
      ? await repeatProgramCycleFn({ data: intent.data }) : await endCycleProgramFn({ data: intent.data }),
    onSuccess: (_, intent) => {
      if (identity.current !== `${intent.data.expectedUserId}:${intent.data.boundaryId}`) return
      request.clearRequest()
      void client.invalidateQueries({ queryKey: accountQueryKeys.user(userId) }).catch(() => undefined)
      onClose()
      void navigate({ to: '/today' })
    },
  })
  const conflict = mutation.isError && /CYCLE_(VERSION_CONFLICT|NO_LONGER_PENDING|ACTIVE_WORKOUT|PENDING_PROGRESSION)|ACCOUNT_CHANGED|PROGRAM_(VERSION_CONFLICT|NOT_ACTIVE|END_ACTIVE_WORKOUT|END_PENDING_REVIEW)/.test(mutation.error.message)
  const retry = mutation.isError && !conflict
  const submit = (action: 'repeat' | 'end') => {
    if (mutation.isPending) return
    if (retry && mutation.variables) { mutation.mutate(mutation.variables); return }
    if (!query.data || !query.isFetchedAfterMount || query.isFetching || query.isError || query.data.activeSessionId || query.data.pendingDecisions.length) return
    const data = { programId: boundary.programId, expectedVersion: query.data.program.stateVersion,
      expectedUserId: userId, boundaryId: boundary.id }
    mutation.mutate({ action, data: { ...data, requestId: request.requestIdFor({ action, ...data }) } })
  }
  const reload = async () => { mutation.reset(); request.clearRequest(); await query.refetch() }
  const reconcile = () => { void client.invalidateQueries({ queryKey: accountQueryKeys.user(userId) }).catch(() => undefined) }
  return { query, mutation, conflict, retry, submit, reload, reconcile }
}
