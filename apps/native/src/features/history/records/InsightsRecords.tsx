import { View } from 'react-native'
import type { HistoryBestSet } from '@sheetless/domain/history/types'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatNumber, formatWeight } from '@sheetless/domain/shared/set-notation'
import { Badge, Caption, EmptyState, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function InsightsRecords({ records }: { records: HistoryBestSet[] }) {
  if (!records.length) {
    return <EmptyState title="No records yet">Complete weighted sets to build recent-training records.</EmptyState>
  }
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Records · available training</SectionLabel>
      <Caption>Best recorded sets by estimated strength. Flagged strength outliers stay in workout history but are excluded from these records.</Caption>
      {records.map((set) => (
        <Panel key={`${set.movementId}-${set.id}`} style={{ gap: 5, padding: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight={800} numberOfLines={1}>{set.movementName}</Text>
              <Caption>{set.sessionTitle} · {formatCompactDate(set.performedAt)}</Caption>
            </View>
            <Badge tone={set.type === 'top_set' ? 'accent' : set.type === 'amrap' ? 'warning' : 'action'}>
              {set.type.replaceAll('_', ' ')}
            </Badge>
          </View>
          <Text size="lg" weight={900}>
            {set.load == null ? 'Bodyweight' : formatWeight(set.load, set.units)} × {set.reps ?? '—'}
          </Text>
          {set.e1rm ? <Caption>Estimated max {formatNumber(set.e1rm)} {set.units}</Caption> : null}
        </Panel>
      ))}
    </View>
  )
}
