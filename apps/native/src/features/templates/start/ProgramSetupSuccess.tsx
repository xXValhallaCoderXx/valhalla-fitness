import { useLayoutEffect, useRef, useState } from 'react'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { ProgramStartReceipt } from '@sheetless/domain/program/reviewed-start'
import { getToday } from '@sheetless/data/session/reads'
import { Button, Caption, Heading, Panel, Screen, Text } from '@/components'
import { buildUserContext } from '@/lib/account'
import { spacing } from '@/lib/tokens'
import { useStartPlannedWorkout } from '@/features/session/today/useStartPlannedWorkout'
import { programSetupReceiptKey } from '../setup-draft'

export function ProgramSetupSuccess({ user, draftId, receipt }: { user: User; draftId: string; receipt: ProgramStartReceipt }) {
  const client = useQueryClient()
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enteringWorkout = useRef(false)
  const owner = useRef<string | null>(user.id)
  useLayoutEffect(() => { owner.current = user.id; return () => { owner.current = null } }, [user.id])
  const start = useStartPlannedWorkout(user, receipt.programId)
  const clearReceipt = () => client.removeQueries({ queryKey: programSetupReceiptKey(user.id, draftId), exact: true })
  const beginWorkout = async () => {
    if (enteringWorkout.current || checking || start.activeStarts || client.isMutating({ mutationKey: ['startSession', user.id] }) > 0) return
    enteringWorkout.current = true
    setChecking(true)
    setError(null)
    try {
      const current = await getToday(buildUserContext(user))
      if (owner.current !== user.id) return
      if (current.activeProgram?.id !== receipt.programId) throw new Error('Your active plan changed. Open Today to review it before starting a workout.')
      if (current.activeSession) throw new Error('A workout is already in progress. Open Today to resume it.')
      if (current.pendingDecisions.length) throw new Error('Progression is waiting for review. Open Today before starting your workout.')
      start.mutate(undefined, { onSuccess: clearReceipt })
    } catch (failure) {
      if (owner.current === user.id) setError(failure instanceof Error ? failure.message : 'Could not check your active plan. Try again.')
    } finally {
      enteringWorkout.current = false
      if (owner.current === user.id) setChecking(false)
    }
  }
  return <Screen padTop={false}>
    <Heading>Your plan is ready</Heading>
    <Text>Your starting numbers and equipment choices have been saved.</Text>
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <Caption>Go to Today to look around, or start your first workout when you are ready.</Caption>
      {error || start.error ? <Text tone="danger">{error ?? (start.error instanceof Error ? start.error.message : 'The workout could not start.')}</Text> : null}
      <Button label="Go to Today" variant="default" disabled={checking || start.activeStarts > 0} onPress={() => { clearReceipt(); router.dismissTo('/(tabs)') }} />
      <Button label="Start first workout" loading={checking || start.isPending} disabled={start.activeStarts > 0} onPress={() => void beginWorkout()} />
    </Panel>
  </Screen>
}
