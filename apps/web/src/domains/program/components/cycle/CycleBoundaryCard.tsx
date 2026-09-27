import { lazy, Suspense, useState } from 'react'
import { Button } from '@mantine/core'
import type { ProgramCycleBoundary } from '@sheetless/domain/program/cycle-boundary'
import { Caption, Heading, Panel, Text } from '~/components'
import { useAccountClock, useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'

const CycleChoiceModal = lazy(() => import('./CycleChoiceModal').then(module => ({ default: module.CycleChoiceModal })))

export function CycleBoundaryCard({ boundary }: { boundary: ProgramCycleBoundary }) {
  const userId = useRequiredAccountId()
  const clock = useAccountClock()
  const [open, setOpen] = useState(false)
  return <Panel className="grid gap-3 p-4" data-testid="cycle-boundary-card">
    <Heading order={2}>Cycle complete</Heading>
    <Caption>Cycle {boundary.cycleNumber} · {new Date(boundary.completedAt).toLocaleDateString(undefined, { timeZone: clock.timeZone })}</Caption>
    <Text size="sm">{boundary.status === 'pending' ? 'Choose whether to repeat your plan or try another one. Your next planned workout will wait.'
      : boundary.status === 'repeated' ? 'You chose to continue with another cycle.'
        : boundary.status === 'replaced' ? 'You moved on to another plan.' : 'You ended this plan. Your workouts are saved.'}</Text>
    {boundary.status === 'pending' ? <Button onClick={() => setOpen(true)}>Choose what comes next</Button> : null}
    {open ? <Suspense fallback={<Text role="status">Loading cycle choices…</Text>}>
      <CycleChoiceModal key={`${userId}:${boundary.id}`} userId={userId} boundary={boundary} onClose={() => setOpen(false)} />
    </Suspense> : null}
  </Panel>
}
