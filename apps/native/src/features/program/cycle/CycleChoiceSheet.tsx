import { useState } from 'react'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { ProgramCycleBoundary } from '@sheetless/domain/program/cycle-boundary'
import { getMovementName } from '@sheetless/domain/movement/movements'
import { Button, Caption, Panel, SectionLabel, SheetModal, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { EndPlanSheet } from '../settings/EndPlanSheet'
import { ProgressionReviewSheet } from '../progression/ProgressionReviewSheet'
import { useCycleChoice } from './useCycleChoice'

export function CycleChoiceSheet({ user, boundary, onClose, onLeave }: {
  user: User; boundary: ProgramCycleBoundary; onClose: () => void; onLeave?: () => void
}) {
  const [step, setStep] = useState<'choice' | 'repeat' | 'review' | 'end'>('choice')
  const [reviewReturn, setReviewReturn] = useState<'repeat' | 'end'>('repeat')
  const leave = () => { onClose(); onLeave?.() }
  const { query, mutation, conflict, retry, submit, reload, reconcile } = useCycleChoice(user, boundary, () => {
    leave(); router.navigate('/(tabs)')
  })
  const data = query.data
  if (step === 'end') return <EndPlanSheet user={user} programId={boundary.programId}
    onClose={() => setStep('choice')} onReview={() => { setReviewReturn('end'); setStep('review') }} onEnded={leave} />
  if (step === 'review' && data) return <ProgressionReviewSheet open user={user} units={data.program.units}
    decisions={data.pendingDecisions} contextLabel={reviewReturn === 'end' ? 'Before ending your plan' : 'Before repeating your plan'}
    onClose={() => { setStep(reviewReturn); void query.refetch() }} />
  const checked = query.isFetchedAfterMount && !query.isFetching && !query.isError
  const close = () => { if (!mutation.isPending) { if (retry) reconcile(); onClose() } }
  return <SheetModal open showHandle title={step === 'repeat' ? 'Repeat this plan' : 'Cycle complete'}
    testID="cycle-choice-sheet" onClose={close} closeDisabled={mutation.isPending}>
    <Text weight={800}>{data?.program.title ?? 'Choose your next step'}</Text>
    <Text>You reached the end of this scheduled block. Your saved workouts stay in history.</Text>
    {!query.isFetchedAfterMount || query.isFetching ? <Text tone="dimmed">Checking your current plan…</Text>
      : query.isError ? <><Text tone="danger">{query.error.message}</Text><Button label="Retry check" onPress={() => void query.refetch()} /></>
      : !data ? <><Text>This cycle no longer needs a choice.</Text><Button label="Open Today" onPress={() => { leave(); router.navigate('/(tabs)') }} /></>
      : data.activeSessionId ? <><Text>Resume your active workout before making this choice.</Text>
        <Button label="Resume workout" onPress={() => { leave(); router.push({ pathname: '/session/[sessionId]', params: { sessionId: data.activeSessionId! } }) }} /></>
      : step === 'repeat' ? <>
        <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.sm }}>
          <SectionLabel>Weights for the next cycle</SectionLabel>
          {data.program.stateValues.map(state => <Text key={state.key} size="sm">
            {getMovementName(state.movementId)} · {state.label ?? (state.type === 'training_max' ? 'Training max' : 'Working weight')}: {state.value ?? 'Unavailable'} {state.unit ?? data.program.units}
          </Text>)}
          <Caption>These are your current saved references. Your equipment and return-guide adjustments still apply.</Caption>
        </Panel>
        {data.pendingDecisions.length ? <>
          <Text>Review {data.pendingDecisions.length} pending progression {data.pendingDecisions.length === 1 ? 'choice' : 'choices'} before confirming these weights.</Text>
          <Button label="Review Apply / Keep" disabled={mutation.isPending} onPress={() => { setReviewReturn('repeat'); setStep('review') }} />
        </> : <Caption>Confirming makes the first workout of the next cycle available. Start it when you are ready.</Caption>}
      </> : <>
        <Button label="Repeat plan" onPress={() => setStep('repeat')} testID="cycle-repeat-plan" />
        <Button label="Choose another plan" variant="default" onPress={() => { leave(); router.push('/templates') }} />
        <Caption>No next planned workout is available until you repeat this plan or confirm a replacement.</Caption>
        <Button label="End this plan" variant="subtle" tone="danger" onPress={() => setStep('end')} />
        <Caption>End this plan first if you want to train with blank workouts instead.</Caption>
      </>}
    {mutation.isError ? <Text tone="danger">{conflict ? 'Your plan changed. Check it again before confirming.'
      : 'The repeat may already be saved. Retry to confirm the same request safely.'}</Text> : null}
    {conflict ? <Button label="Check latest plan" onPress={() => void reload()} />
      : retry || (step === 'repeat' && checked && data && !data.activeSessionId && !data.pendingDecisions.length)
        ? <Button label={retry ? 'Retry Repeat plan' : 'Confirm next cycle'} loading={mutation.isPending}
          onPress={submit} testID="confirm-repeat-cycle" /> : null}
    <Button label="Decide later" variant="default" disabled={mutation.isPending} onPress={close} />
  </SheetModal>
}
