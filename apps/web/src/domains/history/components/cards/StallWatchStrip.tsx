import { Badge } from '@mantine/core'
import { detectStall, stallSignalLabels } from '~/domains/history/lib/strength'
import { shortLiftLabel } from '~/domains/program/lib/program-trajectory'
import type { HistoryInsights, StallSignal } from '~/shared/types'
import { Caption, Panel, SectionLabel } from '~/components'

const STALL_BADGE_COLOR: Record<StallSignal, string> = {
  progressing: 'success',
  watch: 'warning',
  stalled: 'danger',
  insufficient: 'neutral',
}

/**
 * Per-lift PR watch. Hidden entirely after a layoff (stall counts read wrong when
 * you've simply been away) or when no lift has enough history to judge.
 */
export function StallWatchStrip({ insights, staleWelcomeBack }: { insights: HistoryInsights; staleWelcomeBack: boolean }) {
  if (staleWelcomeBack) return null

  const chips = insights.liftSeries
    .map((series) => {
      const stall = detectStall(series.points, insights.generatedAt)
      return { movementId: series.movementId, label: shortLiftLabel(series.movementId) || series.movementName, stall }
    })
    .filter((chip) => chip.stall.signal !== 'insufficient')

  if (!chips.length) return null

  return (
    <Panel p="md">
      <SectionLabel>PR watch</SectionLabel>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Badge key={chip.movementId} color={STALL_BADGE_COLOR[chip.stall.signal]} variant="light" size="lg">
            {chip.label} · {stallSignalLabels[chip.stall.signal]}
          </Badge>
        ))}
      </div>
      <Caption mt={3}>Weeks since each big lift set a new estimated-1RM best.</Caption>
    </Panel>
  )
}
