import { selectScoreDelta } from '~/domains/history/lib/insight-selectors'
import { filterWeeksToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { resolveVolumeTrendSignal, volumeTrendLabels } from '~/domains/history/lib/insight-state'
import { strengthScoreKindLabels } from '~/domains/history/lib/dots'
import { insightCardLabel } from '~/domains/history/lib/insight-labels'
import type { InsightGate } from '~/domains/history/lib/insight-gates'
import type { HistoryDashboardWithInsights, InsightGating, StrengthScoreKind } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { formatCompactDate } from '~/shared/lib/dates'
import { Text } from '~/components'
import { formatLoad, formatNumber } from '../insight-format'
import { InsightStatCell } from '../insights/InsightStatCell'
import { InsightStatStrip } from '../insights/InsightStatStrip'
import { LockedStatCell } from './LockedStatCell'

/**
 * The three figures the screen leads on.
 *
 * Guided leads with what it already has — sessions and weight moved — and keeps the strength score
 * last because it is the one most likely to still be locked. Full leads with the score, because
 * that is the figure its trace is about.
 *
 * The volume figure is the *range* total, not the lifetime one: it sits under a range switch, and
 * a number that ignored the switch would read as a bug.
 */
export function OverviewStatStrip({
  data,
  gating,
  gate,
  range,
  averageMinutes,
  selectedFigure,
  onSelectScore,
}: {
  data: HistoryDashboardWithInsights
  gating: InsightGating
  gate: InsightGate
  range: InsightRange
  /** Mean measured session length in range; null when nothing was timed. */
  averageMinutes: number | null
  selectedFigure: 'strength_score' | null
  onSelectScore?: () => void
}) {
  const { mode, isFull } = useExperienceMode()
  const { insights, overview } = data
  const score = insights.strengthScore

  const weeks = filterWeeksToRange(insights.weeklyVolume, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.today,
  })
  const rangeTotal = weeks.reduce((total, week) => total + week.volume, 0)
  const signal = resolveVolumeTrendSignal(weeks, gating)
  const deloadWeeks = weeks.filter((week) => week.isDeload).length
  const delta = selectScoreDelta(insights, range)

  const sessions = (
    <InsightStatCell
      key="sessions"
      label="Sessions"
      value={overview.completedSessions}
      subline={
        isFull
          ? [
              `${formatNumber(overview.loggedSets)} sets`,
              insights.consistency.avgSessionsPerWeek === null
                ? null
                : `${formatNumber(insights.consistency.avgSessionsPerWeek)} / week`,
              averageMinutes === null ? null : `${averageMinutes} min avg`,
            ]
              .filter(Boolean)
              .join(' · ')
          : `${formatNumber(overview.loggedSets)} sets logged${
              insights.firstSessionDate ? ` since ${formatCompactDate(insights.firstSessionDate)}` : ''
            }`
      }
    />
  )

  const volume = (
    <InsightStatCell
      key="volume"
      label={insightCardLabel('volume', mode)}
      value={formatLoad(rangeTotal, insights.units)}
      subline={
        gating.suppressWeekComparison
          ? 'Comparisons start after week 1.'
          : [
              volumeTrendLabels[signal],
              deloadWeeks > 0 ? `${deloadWeeks} deload ${deloadWeeks === 1 ? 'week' : 'weeks'} in range` : null,
            ]
              .filter(Boolean)
              .join(' · ')
      }
    />
  )

  const strength = gate.unlocked ? (
    <InsightStatCell
      key="strength"
      // Full names the metric in force after the neutral noun — "Strength score · DOTS". Using the
      // Full label here would read "DOTS · DOTS", since that label *is* the metric name.
      label={
        isFull
          ? `${insightCardLabel('strengthScore', 'guided')} · ${strengthScoreKindLabels[score.kind]}`
          : insightCardLabel('strengthScore', mode)
      }
      value={formatScore(score.kind, score.value, insights.units)}
      subline={<ScoreSubline score={score} delta={delta} units={insights.units} />}
      selected={selectedFigure === 'strength_score'}
      onSelect={onSelectScore}
    />
  ) : (
    <LockedStatCell key="strength" label={insightCardLabel('strengthScore', mode)} gate={gate} />
  )

  const cells = isFull ? [strength, sessions, volume] : [sessions, volume, strength]

  return <InsightStatStrip cells={cells} />
}

function ScoreSubline({
  score,
  delta,
  units,
}: {
  score: HistoryDashboardWithInsights['insights']['strengthScore']
  delta: number | null
  units: HistoryDashboardWithInsights['insights']['units']
}) {
  const parts = [
    score.total === null ? null : `${formatLoad(score.total, units)} total`,
    score.bodyweightKg === null ? null : `${formatNumber(score.bodyweightKg)} kg bw`,
  ].filter(Boolean)

  return (
    <>
      {parts.join(' · ')}
      {delta === null ? null : (
        <>
          {parts.length ? ' · ' : ''}
          <Text component="span" size="xs" fw={700} tone={delta < 0 ? 'warning' : 'success'}>
            {delta > 0 ? '+' : ''}
            {formatNumber(delta)}
          </Text>
          {' in range'}
        </>
      )}
    </>
  )
}

function formatScore(kind: StrengthScoreKind, value: number | null, units: HistoryDashboardWithInsights['insights']['units']) {
  if (value === null) return '—'
  if (kind === 'dots') return formatNumber(value)
  if (kind === 'bw_multiple') return `${formatNumber(value)}×`
  if (kind === 'total') return formatLoad(value, units)
  return '—'
}
