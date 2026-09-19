import { Badge } from '@mantine/core'
import { calibrationSignalLabels } from '~/domains/history/lib/calibration'
import { dataLifecycleLabels } from '~/domains/history/lib/insight-state'
import type { HistoryInsights, InsightGating } from '~/domains/history'
import { Caption, SectionLabel } from '~/components'
import { InsightStatCell } from '../insights/InsightStatCell'
import { InsightStatStrip } from '../insights/InsightStatStrip'
import { formatNumber } from '../insight-format'

/**
 * How the training behind the score is going — frequency, streak, volume, effort.
 *
 * A hairline row rather than a boxed panel: these are four readings of one thing, and four bordered
 * tiles inside a fifth border was the pre-v3 shape.
 */
export function TrainingHealthRow({ insights, gating }: { insights: HistoryInsights; gating: InsightGating }) {
  const { calibration, consistency, milestones } = insights
  const nextMilestone = milestones.nextUp

  return (
    <div
      className="pt-5"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <SectionLabel>Training read</SectionLabel>
          <Caption fw={700}>{dataLifecycleLabels[gating.lifecycle]}</Caption>
        </span>
        <Badge color={gating.suppressWeekComparison ? 'warning' : 'success'} variant="light" size="xs">
          {gating.planState === 'active_deload' ? 'Deload week' : calibrationSignalLabels[calibration.signal]}
        </Badge>
      </div>

      <InsightStatStrip
        cells={[
          <InsightStatCell
            key="sessions"
            label="Avg sessions"
            value={consistency.avgSessionsPerWeek === null ? '—' : formatNumber(consistency.avgSessionsPerWeek)}
            subline="per week"
          />,
          <InsightStatCell
            key="streak"
            label="Current streak"
            value={consistency.currentStreakWeeks}
            subline={consistency.currentStreakWeeks === 1 ? 'week' : 'weeks'}
          />,
          <InsightStatCell
            key="reps"
            label="Logged reps"
            value={formatNumber(insights.lifetime.reps)}
            subline={`${formatNumber(insights.lifetime.sets)} sets, all time`}
          />,
          <InsightStatCell
            key="effort"
            label="RIR match"
            value={
              calibration.meanGap === null
                ? '—'
                : `${calibration.meanGap > 0 ? '+' : ''}${formatNumber(calibration.meanGap)}`
            }
            subline={
              nextMilestone
                ? `${calibration.pairedSetCount} paired sets · next: ${nextMilestone.label}`
                : `${calibration.pairedSetCount} paired sets`
            }
          />,
        ]}
      />
    </div>
  )
}
