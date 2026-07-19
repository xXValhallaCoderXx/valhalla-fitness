import { Badge } from '@mantine/core'
import { formatCompactDate } from '~/shared/lib/dates'
import { bestSetAccent, bestSetTagLabel, groupBestSets } from '~/domains/history/lib/insights'
import type { HistoryBestSet, HistoryDashboard } from '~/shared/types'
import { Caption, EmptyState, Panel, SectionLabel, Text } from '~/components'
import { ACCENT_TEXT, formatBestSetPrimary, formatE1rm } from '../insight-format'

export function RecordsTab({ data }: { data: HistoryDashboard }) {
  const groups = groupBestSets(data.bestSets)
  if (!groups.length) {
    return <EmptyState title="No records yet">Complete sets with load and reps to build records.</EmptyState>
  }
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-3 flex items-center gap-3">
            <SectionLabel>{group.title}</SectionLabel>
            <span className="h-px flex-1" style={{ backgroundColor: 'var(--mantine-color-default-border)' }} />
            <Caption>{group.items.length}</Caption>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((set) => (
              <RecordCard key={`${set.movementId}-${set.id}`} set={set} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function RecordCard({ set }: { set: HistoryBestSet }) {
  const accent = bestSetAccent(set.type)
  return (
    <Panel p="sm" className="relative overflow-hidden">
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: ACCENT_TEXT[accent] }} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <Text fw={800} truncate>{set.movementName}</Text>
          <Caption mt={1} truncate>{set.sessionTitle} · {formatCompactDate(set.performedAt)}</Caption>
        </div>
        <Badge color={accent} variant="light" style={{ flexShrink: 0 }}>{bestSetTagLabel(set.type)}</Badge>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2 pl-2">
        <div className="min-w-0">
          <Text component="span" size="lg" fw={800}>{formatBestSetPrimary(set)}</Text>
          {typeof set.rir === 'number' ? <Caption component="span" ml={6}>RIR {set.rir}</Caption> : null}
        </div>
        <div className="shrink-0 text-right">
          <Text size="sm" fw={800} tone="action">{formatE1rm(set)}</Text>
          <SectionLabel>e1RM</SectionLabel>
        </div>
      </div>
    </Panel>
  )
}
