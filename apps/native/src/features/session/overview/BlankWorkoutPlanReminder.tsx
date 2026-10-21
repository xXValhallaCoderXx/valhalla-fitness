import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { Button, Caption, Panel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { todayQueryOptions } from '../queries'
import { BlankWorkoutPlanPreview } from './BlankWorkoutPlanPreview'

export function BlankWorkoutPlanReminder({ user, disabled, onDiscardBlank }: {
  user: User; disabled: boolean; onDiscardBlank?: () => void
}) {
  const [open, setOpen] = useState(false)
  const today = useQuery({ ...todayQueryOptions(user), staleTime: 0, refetchOnMount: 'always' })
  const plan = today.data?.plannedSession
  if (!today.isFetchedAfterMount) return null
  if (!plan && !today.isError) return null
  return <>
    <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.sm }}>
      {today.isError ? <>
        <Text size="sm" tone="danger">Unable to check your planned workout.</Text>
        <Button label="Retry planned workout" variant="subtle" loading={today.isFetching}
          onPress={() => void today.refetch()} />
      </> : <>
        <Text weight={700}>{plan!.title} is still in your plan</Text>
        <Caption>This blank workout leaves your planned workout available for later.</Caption>
        <Button label="View planned workout" variant="subtle" disabled={disabled} onPress={() => setOpen(true)} />
      </>}
    </Panel>
    {open ? <BlankWorkoutPlanPreview user={user} disabled={disabled} onClose={() => setOpen(false)}
      onDiscardBlank={onDiscardBlank ? () => { setOpen(false); onDiscardBlank() } : undefined} /> : null}
  </>
}
