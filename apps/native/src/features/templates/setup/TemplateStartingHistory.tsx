import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { Button, Caption, PageHeader, Panel, Screen, Text } from '@/components'
import { historyDashboardQueryOptions } from '@/features/history/queries'
import { spacing } from '@/lib/tokens'
import type { StartingHistory } from '../start/useProgramStartingLoads'

/** Resolve recorded strength before mounting the editable setup draft. */
export function TemplateStartingHistory({ user, required, title, children }: {
  user: User
  required: boolean
  title: string
  children: (history: StartingHistory) => ReactNode
}) {
  const history = useQuery({ ...historyDashboardQueryOptions(user), enabled: required })
  if (!required) return children(null)
  if (history.data) return children(history.data.insights)
  return (
    <Screen>
      <PageHeader title={title} />
      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        {history.isError ? <>
          <Text tone="danger">{history.error instanceof Error ? history.error.message : 'Starting strength could not load.'}</Text>
          <Caption>Your recorded lifts are needed to suggest starting loads.</Caption>
          <Button label="Retry" variant="default" loading={history.isFetching} onPress={() => void history.refetch()} />
        </> : <Text tone="dimmed">Checking your recorded lifts…</Text>}
      </Panel>
    </Screen>
  )
}
