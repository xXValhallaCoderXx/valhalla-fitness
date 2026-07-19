import { Badge } from '@mantine/core'
import { buildMovementBalance, balanceSignalLabels } from '~/domains/history/lib/muscle-volume'
import { filterToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import type { HistoryInsights } from '~/shared/types'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { formatNumber } from '../insight-format'

const GROUP_COLOR: Record<string, string> = {
  Push: 'var(--vf-action-text)',
  Pull: 'var(--vf-accent-text)',
  Legs: 'var(--vf-success-text)',
  Core: 'var(--vf-warning-text)',
}

export function MuscleSetsCard({ insights, range }: { insights: HistoryInsights; range: InsightRange }) {
  const weekly = filterToRange(insights.weeklyRegionSets, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.generatedAt,
    getDate: (week) => week.weekStart,
  })
  const balance = buildMovementBalance(weekly, null)
  const groups = [
    { label: 'Push', sets: balance.pushSets },
    { label: 'Pull', sets: balance.pullSets },
    { label: 'Legs', sets: balance.legSets },
    { label: 'Core', sets: balance.coreSets },
  ]
  const max = Math.max(1, ...groups.map((group) => group.sets))

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionLabel>Muscle balance</SectionLabel>
        {balance.signal !== 'insufficient' ? (
          <Badge color={balance.signal === 'balanced' ? 'success' : 'warning'} variant="light">
            {balanceSignalLabels[balance.signal]}
          </Badge>
        ) : null}
      </div>

      {balance.signal === 'insufficient' ? (
        <Caption mt="sm">Muscle balance appears after about 20 logged sets in range.</Caption>
      ) : (
        <>
          <div className="mt-3 space-y-2.5">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Text size="sm" fw={600}>
                    {group.label}
                  </Text>
                  <Text size="xs" fw={700} tone="dimmed">
                    {formatNumber(group.sets)} sets
                  </Text>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-inset)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((group.sets / max) * 100)}%`, backgroundColor: GROUP_COLOR[group.label] }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Caption mt={3}>
            {formatNumber(balance.totalSets)} sets across {balance.weeks} {balance.weeks === 1 ? 'week' : 'weeks'}.
          </Caption>
        </>
      )}
    </Panel>
  )
}
