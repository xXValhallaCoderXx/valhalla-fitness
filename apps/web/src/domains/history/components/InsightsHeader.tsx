import { Badge } from '@mantine/core'
import { ScreenHeader } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import type { InsightGating } from '~/domains/history'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import { dataLifecycleLabels, ESTABLISHED_MIN_SESSIONS } from '~/domains/history/lib/insight-state'
import { InsightRangeSwitch } from './InsightRangeSwitch'

/**
 * The v3 screen header: title, one line of context, and the range control on the same row.
 *
 * Guided says what the screen is for and carries the lifecycle as a chip; Full folds the lifecycle
 * into the subtitle instead, because by then the lifter knows what the screen is and wants to know
 * how much data is behind it.
 */
export function InsightsHeader({
  gating,
  completedSessions,
  range,
  showRange,
  onRangeChange,
}: {
  gating: InsightGating
  completedSessions: number
  range: InsightRange
  /** Four of the six tabs ignore the range; a control that does nothing is worse than none. */
  showRange: boolean
  onRangeChange: (range: InsightRange) => void
}) {
  const { isFull } = useExperienceMode()
  const lifecycle = dataLifecycleLabels[gating.lifecycle]

  return (
    <ScreenHeader
      title="Insights"
      subtitle={
        isFull
          ? `${lifecycle} · ${completedSessions} session${completedSessions === 1 ? '' : 's'}`
          : 'A clearer view of your training.'
      }
      actions={
        <>
          {isFull ? null : <LifecycleChip gating={gating} completedSessions={completedSessions} />}
          {showRange ? <InsightRangeSwitch value={range} onChange={onRangeChange} /> : null}
        </>
      }
    />
  )
}

/**
 * Where this account sits on the data curve. The counter is the honest part: "Building your
 * baseline" alone doesn't tell a lifter how much more training opens the rest of the screen.
 */
function LifecycleChip({ gating, completedSessions }: { gating: InsightGating; completedSessions: number }) {
  const label = dataLifecycleLabels[gating.lifecycle]
  const showCount = gating.lifecycle === 'warming' || gating.lifecycle === 'cold_start'
  return (
    <Badge color="neutral" variant="light">
      {showCount ? `${label} · ${completedSessions} of ${ESTABLISHED_MIN_SESSIONS} sessions` : label}
    </Badge>
  )
}
