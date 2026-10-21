import { useLayoutEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { ProgramCycleBoundary } from '@sheetless/domain/program/cycle-boundary'
import { getCycleReview, repeatProgramCycle } from '@sheetless/data/program/cycle-boundary'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'

export function useCycleChoice(user: User, boundary: ProgramCycleBoundary, onRepeated: () => void) {
  const client = useQueryClient()
  const request = useStableMutationRequest()
  const identity = useRef<string | null>(null)
  useLayoutEffect(() => {
    identity.current = `${user.id}:${boundary.id}`
    return () => { identity.current = null }
  }, [user.id, boundary.id])
  const query = useQuery({
    queryKey: [...accountQueryKeys.program(user.id), 'cycle', boundary.id],
    queryFn: () => getCycleReview(buildUserContext(user), { programId: boundary.programId, boundaryId: boundary.id }),
    staleTime: 0, refetchOnMount: 'always',
  })
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof repeatProgramCycle>[1]) => repeatProgramCycle(buildUserContext(user), input),
    onSuccess: (_, input) => {
      if (identity.current !== `${input.expectedUserId}:${input.boundaryId}`) return
      request.clearRequest(input.requestId)
      void client.invalidateQueries({ queryKey: accountQueryKeys.user(user.id) }).catch(() => undefined)
      onRepeated()
    },
  })
  const conflict = mutation.isError && /CYCLE_(VERSION_CONFLICT|NO_LONGER_PENDING|ACTIVE_WORKOUT|PENDING_PROGRESSION)|ACCOUNT_CHANGED/.test(mutation.error.message)
  const retry = mutation.isError && !conflict
  const submit = () => {
    if (mutation.isPending) return
    if (retry && mutation.variables) { mutation.mutate(mutation.variables); return }
    if (!query.data || !query.isFetchedAfterMount || query.isFetching || query.isError || query.data.activeSessionId || query.data.pendingDecisions.length) return
    const intent = { programId: boundary.programId, boundaryId: boundary.id,
      expectedUserId: user.id, expectedVersion: query.data.program.stateVersion }
    mutation.mutate({ ...intent, requestId: request.requestIdFor(intent) })
  }
  const reload = async () => { mutation.reset(); request.clearRequest(); await query.refetch() }
  const reconcile = () => { void client.invalidateQueries({ queryKey: accountQueryKeys.user(user.id) }).catch(() => undefined) }
  return { query, mutation, conflict, retry, submit, reload, reconcile }
}
