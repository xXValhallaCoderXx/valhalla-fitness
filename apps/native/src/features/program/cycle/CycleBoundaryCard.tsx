import { useState } from 'react'
import { useIsFocused } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { ProgramCycleBoundary } from '@sheetless/domain/program/cycle-boundary'
import { Button, Caption, Heading, Panel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { useMe } from '@/lib/account'
import { CycleChoiceSheet } from './CycleChoiceSheet'

export function CycleBoundaryCard({ boundary, user, onLeave }: {
  boundary: ProgramCycleBoundary; user: User; onLeave?: () => void
}) {
  const me = useMe()
  const [open, setOpen] = useState(false)
  const focused = useIsFocused()
  const pending = boundary.status === 'pending'
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <Heading order={2}>Cycle complete</Heading>
    <Caption>Cycle {boundary.cycleNumber} · {new Date(boundary.completedAt).toLocaleDateString(undefined, { timeZone: me.data?.timezone ?? undefined })}</Caption>
    <Text size="sm">{pending ? 'Choose whether to repeat your plan or try another one. Your next planned workout will wait.'
      : boundary.status === 'repeated' ? 'You chose to continue with another cycle.'
        : boundary.status === 'replaced' ? 'You moved on to another plan.' : 'You ended this plan. Your workouts are saved.'}</Text>
    {pending ? <Button label="Choose what comes next" onPress={() => setOpen(true)} /> : null}
    {open && focused ? <CycleChoiceSheet key={`${user.id}:${boundary.id}`} user={user} boundary={boundary}
      onClose={() => setOpen(false)} onLeave={onLeave} /> : null}
  </Panel>
}
