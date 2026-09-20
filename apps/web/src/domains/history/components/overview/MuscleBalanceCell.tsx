import { balanceSignalLabels, buildMovementBalance } from '~/domains/history/lib/muscle-volume'
import { filterWeeksToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import type { HistoryInsights } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, Text } from '~/components'
import { formatNumber } from '../insight-format'

const GROUP_COLOR: Record<string, string> = {
  Push: 'var(--vf-action-text)',
  Pull: 'var(--vf-accent-text)',
  Legs: 'var(--vf-success-text)',
  Core: 'var(--vf-warning-text)',
}

/**
 * Where the work landed, by movement group.
 *
 * The window is whatever the range switch says, not a fixed three weeks — the control is supposed
 * to govern the page — so the qualifier reports the weeks actually summed.
 */
export function MuscleBalanceCell({ insights, range }: { insights: HistoryInsights; range: InsightRange }) {
  const { isFull } = useExperienceMode()
  const weekly = filterWeeksToRange(insights.weeklyRegionSets, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.today,
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
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        {/* "Muscle balance" is its own text node; the qualifier is nested so text locators stay exact. */}
        <Text size="sm" fw={700}>
          Muscle balance
          <Caption component="span" fw={600}>
            {' '}
            · {isFull ? 'weighted sets' : 'sets'}, {balance.weeks} {isFull ? 'wk' : balance.weeks === 1 ? 'week' : 'weeks'}
          </Caption>
        </Text>
        {balance.signal === 'insufficient' ? null : (
          <Caption fw={700} className="shrink-0" tone={balance.signal === 'balanced' ? 'success' : 'warning'}>
            {balanceSignalLabels[balance.signal]}
          </Caption>
        )}
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {groups.map((group) => (
          <div key={group.label} className="flex items-center gap-2.5">
            <Caption className="w-9 shrink-0">{group.label}</Caption>
            <span
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: 'var(--vf-surface-inset)' }}
            >
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.round((group.sets / max) * 100)}%`, backgroundColor: GROUP_COLOR[group.label] }}
              />
            </span>
            <Caption
              fw={700}
              className="shrink-0 whitespace-nowrap"
              ta="right"
              style={{ fontVariantNumeric: 'tabular-nums', width: '4.25rem' }}
            >
              {formatNumber(group.sets)} sets
            </Caption>
          </div>
        ))}
      </div>
    </div>
  )
}
