import { useState } from 'react'
import { View } from 'react-native'
import type { BodyweightEntry } from '@sheetless/domain/account/types'
import { buildBodyweightTrend } from '@sheetless/domain/history/bodyweight-trend'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { convertWeight } from '@sheetless/domain/shared/math'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import type { Unit } from '@sheetless/domain/shared/types'
import { Button, Caption, LineChart, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function BodyweightHistory({ entries, units, today, disabled, onDelete }: {
  entries: BodyweightEntry[]; units: Unit; today: string; disabled: boolean; onDelete: (entry: BodyweightEntry) => void
}) {
  const [visibleCount, setVisibleCount] = useState(20)
  const trend = buildBodyweightTrend({ entries, units, today, range: 'all' })
  const ordered = [...entries].sort((left, right) => right.recordedOn.localeCompare(left.recordedOn))
  return <>
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>All measurements</SectionLabel>
      {trend.latest ? <>
        <Text size="xl" weight={900}>{formatWeight(trend.latest.value, units)}</Text>
        <Caption>Latest recorded · {formatCompactDate(trend.latest.date)}</Caption>
        <LineChart tone="default" inspectable showPoints
          points={trend.points.map(point => ({ ...point, label: formatCompactDate(point.date) }))}
          formatValue={value => formatWeight(value, units) ?? '—'} accessibilityLabel="All bodyweight measurements"
          emptyMessage="No measurements through today." />
        {trend.change !== null ? <Caption>Change across these measurements: {trend.change > 0 ? '+' : ''}{formatWeight(trend.change, units)}</Caption> : null}
        {trend.count === 1 ? <Caption>One measurement. Log another to see a change.</Caption> : null}
      </> : <Text tone="dimmed">No measurements recorded through today.</Text>}
      <Caption>Actual measurements on their recorded dates. No smoothing or weight-goal assumptions.</Caption>
    </Panel>
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>History · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</SectionLabel>
      {ordered.slice(0, visibleCount).map(entry => <Panel key={entry.id} surface="inset" style={{ padding: spacing.sm, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight={800}>{formatWeight(convertWeight(entry.weightKg, 'kg', units), units)}</Text>
            <Caption>{formatCompactDate(entry.recordedOn)}</Caption>
          </View>
          <Button label="Delete" variant="subtle" tone="danger" disabled={disabled}
            accessibilityLabel={`Delete bodyweight entry from ${formatCompactDate(entry.recordedOn)}`} onPress={() => onDelete(entry)} />
        </View>
        {entry.recordedOn > today ? <Caption>Future-dated entry · excluded from the chart until its date.</Caption> : null}
      </Panel>)}
      {ordered.length > visibleCount ? <>
        <Caption>{visibleCount} of {ordered.length} entries shown.</Caption>
        <Button label="Show more entries" variant="default" onPress={() => setVisibleCount(value => value + 20)} />
      </> : null}
    </View>
  </>
}
