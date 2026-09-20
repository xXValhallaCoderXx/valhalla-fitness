import { joinPlannedConsistency } from '~/domains/history/lib/consistency'
import { insightCardLabel } from '~/domains/history/lib/insight-labels'
import type { ConsistencySummary } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, StatValue, Text } from '~/components'
import { formatNumber } from '../insight-format'

/**
 * How often training actually happens, against how often the plan asks.
 *
 * The heading owns its text with nothing appended — "Showing up" is matched anchored in the e2e,
 * and a qualifier in the same node would break it.
 */
export function ShowingUpCell({
  consistency,
  plannedPerWeek,
}: {
  consistency: ConsistencySummary
  /** Sessions a week the active programme asks for; null without one. */
  plannedPerWeek: number | null
}) {
  const { mode, isFull } = useExperienceMode()
  const joined = joinPlannedConsistency(consistency, plannedPerWeek)

  return (
    <div className="min-w-0">
      <Text size="sm" fw={700}>{insightCardLabel('consistency', mode)}</Text>
      <div className="mt-1 flex items-baseline gap-1.5">
        <StatValue size="lg" lh={1.1} lts="-0.5px">
          {joined.avgSessionsPerWeek === null ? '—' : formatNumber(joined.avgSessionsPerWeek)}
        </StatValue>
        <Caption fw={600}>{isFull ? 'sessions / week' : 'sessions a week'}</Caption>
      </div>
      <Caption component="p" mt={4} lh={1.45} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {sublineFor(joined, isFull)}
      </Caption>
    </div>
  )
}

function sublineFor(joined: ReturnType<typeof joinPlannedConsistency>, isFull: boolean): string {
  const weeks = `${joined.totalWeeks} ${joined.totalWeeks === 1 ? 'week' : 'weeks'} in`
  if (isFull) {
    return [
      joined.plannedPerWeek === null ? null : `Planned ${joined.plannedPerWeek}`,
      joined.adherencePercent === null ? null : `adherence ${joined.adherencePercent} %`,
      `longest streak ${joined.longestStreakWeeks}`,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  const plan = joined.plannedPerWeek === null ? null : `Plan says ${joined.plannedPerWeek}.`
  return [plan, `${weeks}.`].filter(Boolean).join(' ')
}
