import { Badge } from '@mantine/core'
import { calibrationSignalLabels } from '~/domains/history/lib/calibration'
import type { CalibrationSummary, CalibrationSignal } from '~/shared/types'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { formatNumber } from '../insight-format'

const CALIBRATION_BADGE_COLOR: Record<CalibrationSignal, string> = {
  on_target: 'success',
  leaning_easy: 'accent',
  leaning_hard: 'warning',
  no_rir_data: 'neutral',
}

/** Rendered only when there's paired-RIR data — parent guards on signal !== 'no_rir_data'. */
export function CalibrationCard({ calibration }: { calibration: CalibrationSummary }) {
  const gap = calibration.meanGap ?? 0

  return (
    <Panel p="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionLabel>Effort calibration</SectionLabel>
        <Badge color={CALIBRATION_BADGE_COLOR[calibration.signal]} variant="light">
          {calibrationSignalLabels[calibration.signal]}
        </Badge>
      </div>

      <Text mt={3} size="sm">
        {bodyCopy(calibration.signal, Math.abs(gap))}
      </Text>

      {calibration.rirFatigue === 'fatigue_rising' ? (
        <Text mt={3} size="sm" fw={700} tone="warning">
          Your effort readings have been climbing for 3+ weeks — consider an easier week.
        </Text>
      ) : null}

      <Caption mt={3}>From {calibration.pairedSetCount} sets with prescribed + logged RIR (last 6 weeks).</Caption>
    </Panel>
  )
}

function bodyCopy(signal: CalibrationSignal, absGap: number) {
  if (signal === 'on_target') return 'Your logged RIR lands where the plan expects — prescriptions are dialed in.'
  if (signal === 'leaning_easy') {
    return `You're finishing with about ${formatNumber(absGap)} more RIR than prescribed — there may be room to push.`
  }
  if (signal === 'leaning_hard') {
    return `You're finishing about ${formatNumber(absGap)} RIR closer to failure than prescribed — watch recovery.`
  }
  return 'Log prescribed and actual RIR on plan sessions to see how your effort tracks.'
}
