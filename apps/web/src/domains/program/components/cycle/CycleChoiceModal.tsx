import { useState } from 'react'
import { Button, Modal } from '@mantine/core'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ProgramCycleBoundary } from '@sheetless/domain/program/cycle-boundary'
import { getMovementName } from '@sheetless/domain/movement/movements'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { PendingProgressionReviewModal } from '../PendingReview'
import { useCycleChoice } from './useCycleChoice'

export function CycleChoiceModal({ userId, boundary, onClose }: {
  userId: string; boundary: ProgramCycleBoundary; onClose: () => void
}) {
  const navigate = useNavigate()
  const [step, setStep] = useState<'choice' | 'repeat' | 'review' | 'end'>('choice')
  const [reviewReturn, setReviewReturn] = useState<'repeat' | 'end'>('repeat')
  const { query, mutation, conflict, retry, submit, reload, reconcile } = useCycleChoice(userId, boundary, onClose)
  const data = query.data
  if (step === 'review' && data) return <PendingProgressionReviewModal opened decisions={data.pendingDecisions}
    units={data.program.units} contextLabel="this cycle" onClose={() => { setStep(reviewReturn); void query.refetch() }} />
  const checked = query.isFetchedAfterMount && !query.isFetching && !query.isError
  const close = () => { if (!mutation.isPending) { if (retry) reconcile(); onClose() } }
  return <Modal opened onClose={close} closeOnClickOutside={!mutation.isPending}
    closeOnEscape={!mutation.isPending} withCloseButton={!mutation.isPending} title={step === 'end' ? 'End this plan?' : step === 'repeat' ? 'Repeat this plan' : 'Cycle complete'}>
    <div className="grid gap-3" data-testid="cycle-choice-modal">
      <Text fw={700}>{data?.program.title ?? 'Choose your next step'}</Text>
      <Text>You reached the end of this scheduled block. Your saved workouts stay in history.</Text>
      {!query.isFetchedAfterMount || query.isFetching ? <Text tone="dimmed">Checking your current plan…</Text>
        : query.isError ? <><Text tone="danger">{query.error.message}</Text><Button onClick={() => void query.refetch()}>Retry check</Button></>
        : !data ? <><Text>This cycle no longer needs a choice.</Text><Button component={Link} to="/today" onClick={onClose}>Open Today</Button></>
        : data.activeSessionId ? <><Text>Resume your active workout before making this choice.</Text>
          <Button onClick={() => { onClose(); void navigate({ to: '/sessions/$sessionId', params: { sessionId: data.activeSessionId! } }) }}>Resume workout</Button></>
        : step === 'choice' ? <>
          <Button onClick={() => setStep('repeat')}>Repeat plan</Button>
          <Button variant="default" onClick={() => { onClose(); void navigate({ to: '/templates' }) }}>Choose another plan</Button>
          <Caption>Your next planned workout waits until you repeat or confirm a replacement.</Caption>
          <Button variant="subtle" color="red" onClick={() => setStep('end')}>End this plan</Button>
          <Caption>End this plan first if you want to train with blank workouts instead.</Caption>
        </> : <>
          {step === 'end' ? <Text>End the current plan and any return guide. Your saved workouts, records and working weights stay in history.</Text>
            : <Panel className="grid gap-2 p-3">
              <SectionLabel>Weights for the next cycle</SectionLabel>
              {data.program.stateValues.map(state => <Text size="sm" key={state.key}>
                {getMovementName(state.movementId)} · {state.label ?? (state.type === 'training_max' ? 'Training max' : 'Working weight')}: {state.value ?? 'Unavailable'} {state.unit ?? data.program.units}
              </Text>)}
              <Caption>These are your saved references. Equipment and return-guide adjustments still apply. Confirming makes the first workout available without starting it.</Caption>
            </Panel>}
          {data.pendingDecisions.length ? <><Text>Review your pending progression choices first.</Text>
            <Button disabled={mutation.isPending} onClick={() => { setReviewReturn(step === 'end' ? 'end' : 'repeat'); setStep('review') }}>Review Apply / Keep</Button></> : null}
        </>}
      {mutation.isError ? <Text tone="danger">{conflict ? 'Your plan changed. Check it again before confirming.'
        : 'This choice may already be saved. Retry to confirm the same request safely.'}</Text> : null}
      {conflict ? <Button onClick={() => void reload()}>Check latest plan</Button>
        : retry || ((step === 'repeat' || step === 'end') && checked && data && !data.activeSessionId && !data.pendingDecisions.length)
          ? <Button loading={mutation.isPending} onClick={() => submit(step === 'end' ? 'end' : 'repeat')}>
            {retry ? 'Retry saved choice' : step === 'end' ? 'Confirm End plan' : 'Confirm next cycle'}</Button> : null}
      <Button variant="default" disabled={mutation.isPending} onClick={close}>Decide later</Button>
    </div>
  </Modal>
}
