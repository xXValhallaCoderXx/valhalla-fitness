import { calibrationSignalLabels } from '~/domains/history/lib/calibration'
import { insightCardLabel } from '~/domains/history/lib/insight-labels'
import type { CalibrationSummary } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, StatValue, Text } from '~/components'
import { formatNumber } from '../insight-format'

/**
 * Whether the work is landing where the plan asked.
 *
 * The window is a fixed six weeks — `CALIBRATION_WINDOW_WEEKS`, not the range switch — so the
 * subline says so rather than letting the figure look like it moved with the range.
 */
export function EffortCell({ calibration }: { calibration: CalibrationSummary }) {
  const { mode, isFull } = useExperienceMode()
  const gap = calibration.meanGap

  return (
    <div className="min-w-0">
      <Text size="sm" fw={700}>{insightCardLabel('effort', mode)}</Text>
      <StatValue component="p" size="md" mt={4} lh={1.15} lts="-0.4px">
        {calibrationSignalLabels[calibration.signal]}
      </StatValue>
      <Caption component="p" mt={4} lh={1.45} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {gap === null
          ? `Needs sets logged with both a planned and an actual effort · last 6 weeks`
          : `${isFull ? 'Mean RIR' : 'Effort'} ${gap > 0 ? '+' : ''}${formatNumber(gap)} vs target · ${calibration.pairedSetCount} sets with RIR · last 6 weeks`}
      </Caption>
      {calibration.rirFatigue === 'fatigue_rising' ? (
        <Caption component="p" mt={4} fw={700} tone="warning" lh={1.45}>
          Effort has been climbing for 3+ weeks — consider an easier week.
        </Caption>
      ) : null}
    </div>
  )
}
