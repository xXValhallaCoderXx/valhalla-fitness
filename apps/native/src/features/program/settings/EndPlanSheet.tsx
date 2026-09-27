import { useLayoutEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { router } from 'expo-router'
import { endProgram, getProgramEndState } from '@sheetless/data/program/ending'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, Caption, SheetModal, Text } from '@/components'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'

type EndPlanSheetProps = {
  user: User; programId: string; onClose: () => void; onReview: () => void; onEnded?: () => void
}

export function EndPlanSheet(props: EndPlanSheetProps) {
  return <EndPlanConfirmation key={`${props.user.id}:${props.programId}`} {...props} />
}

function EndPlanConfirmation({ user, programId, onClose, onReview, onEnded }: EndPlanSheetProps) {
  const mounted = useRef(true)
  useLayoutEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const queryClient = useQueryClient()
  const request = useStableMutationRequest()
  const state = useQuery({
    queryKey: [...accountQueryKeys.program(user.id), 'end', programId],
    queryFn: () => getProgramEndState(buildUserContext(user), programId),
    staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: false,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.user(user.id) })
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof endProgram>[1]) => endProgram(buildUserContext(user), input),
    onSuccess: (_, input) => {
      if (!mounted.current) return
      request.clearRequest(input.requestId)
      // Invalidation can unmount this sheet when Plan learns it has ended.
      // Navigate in this confirmed lifetime, without a late callback after refresh.
      void refresh().catch(() => undefined)
      if (onEnded) onEnded()
      else onClose()
      router.navigate('/(tabs)')
    },
  })
  const data = state.data
  const conflict = mutation.error && /PROGRAM_(VERSION_CONFLICT|NOT_ACTIVE|END_ACTIVE_WORKOUT|END_PENDING_REVIEW)/.test(mutation.error.message)
  const retry = mutation.isError && !conflict
  const close = () => {
    if (mutation.isPending) return
    if (retry) void refresh().catch(() => undefined)
    onClose()
  }
  const refreshThen = async (action: () => void) => {
    await refresh()
    if (mounted.current) action()
  }
  const submit = () => {
    if (mutation.isPending) return
    if (retry && mutation.variables) { mutation.mutate(mutation.variables); return }
    if (!data) return
    const intent = { programId, expectedVersion: data.stateVersion }
    mutation.mutate({ ...intent, requestId: request.requestIdFor(intent) })
  }
  const reload = async () => {
    mutation.reset()
    request.clearRequest()
    await state.refetch()
  }
  return <SheetModal open showHandle title="End this plan?" testID="end-plan-sheet" closeDisabled={mutation.isPending}
    onClose={close}>
    <Text weight={800}>{data?.title ?? 'Your current plan'}</Text>
    <Text>Your saved workouts, records and working weights stay in history. This ends the active plan; it does not mark unlogged workouts as completed.</Text>
    <Caption>You can choose a new plan afterwards. Any return guide for this plan will end too.</Caption>
    {!state.isFetchedAfterMount || state.isFetching ? <Text tone="dimmed">Checking your latest plan…</Text>
      : state.isError ? <><Text tone="danger">{state.error.message}</Text><Button label="Retry check" onPress={() => void state.refetch()} /></>
      : data?.status !== 'active' ? <><Text>This plan is no longer active.</Text><Button label="Refresh Plan" onPress={() => void refreshThen(onClose)} /></>
      : data.activeSessionId ? <><Text>Finish or discard this plan’s active workout before ending the plan.</Text>
        <Button label="Resume workout" onPress={() => { onClose(); router.push({ pathname: '/session/[sessionId]', params: { sessionId: data.activeSessionId! } }) }} /></>
      : data.hasPendingDecisions ? <><Text>Review your saved workout’s progression before ending this plan.</Text>
        <Button label="Review progression" onPress={() => void refreshThen(onReview)} /></>
      : null}
    {mutation.isError ? <Text tone="danger">{conflict
      ? 'Your plan changed. Check its latest state before confirming again.'
      : 'The plan may already be ended. Retry to safely confirm the same request.'}</Text> : null}
    {conflict ? <Button label="Check latest plan" onPress={() => void reload()} /> :
      retry || (state.isFetchedAfterMount && !state.isError && data?.status === 'active' && !data.activeSessionId && !data.hasPendingDecisions)
        ? <Button label={retry ? 'Retry End plan' : 'End plan'} tone="danger" loading={mutation.isPending}
          disabled={state.isFetching} onPress={submit} testID="confirm-end-plan" /> : null}
    <Button label={retry ? 'Close' : 'Keep plan'} variant="default" disabled={mutation.isPending} onPress={close} />
  </SheetModal>
}
