import { Badge } from '@mantine/core'
import type { ReactNode } from 'react'
import { useExperienceMode } from '~/domains/account/components'
import type { InsightGate, InsightGateId } from '~/domains/history/lib/insight-gates'
import { insightCardLabel, thinDataBadgeLabel } from '~/domains/history/lib/insight-labels'
import type { HistoryDashboardWithInsights, InsightGating } from '~/domains/history'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import { Caption } from '~/components'
import { CalibrationCard } from '../cards/CalibrationCard'
import { ConsistencyCard } from '../cards/ConsistencyCard'
import { LockedInsightCard } from '../cards/LockedInsightCard'
import { MuscleSetsCard } from '../cards/MuscleSetsCard'
import { StallWatchStrip } from '../cards/StallWatchStrip'
import { StrengthScoreCard } from '../cards/StrengthScoreCard'
import { VolumeTrendCard } from '../cards/VolumeTrendCard'
import type { HistoryTab } from '../insight-format'

/**
 * The Overview card grid, with each card behind its data gate.
 *
 * Guided swaps a card that hasn't earned its data for the locked state, so the screen never shows
 * an empty box without saying why. Full keeps the real card and flags the thin sample instead —
 * the design's rule is that Full never hides a number, it qualifies it.
 */
export function OverviewInsightGrid({
  data,
  gating,
  gates,
  range,
  onNavigate,
}: {
  data: HistoryDashboardWithInsights
  gating: InsightGating
  gates: Record<InsightGateId, InsightGate>
  range: InsightRange
  onNavigate: (tab: HistoryTab) => void
}) {
  const { mode } = useExperienceMode()
  const { insights } = data

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <GatedCard gate={gates.strength_score} title={insightCardLabel('strengthScore', mode)}>
        <StrengthScoreCard
          insights={insights}
          completedSessions={data.overview.completedSessions}
          range={range}
          onNavigate={onNavigate}
        />
      </GatedCard>

      <GatedCard gate={gates.volume_trend} title={insightCardLabel('volumeWeekly', mode)}>
        <VolumeTrendCard insights={insights} gating={gating} range={range} />
      </GatedCard>

      <GatedCard gate={gates.consistency} title={insightCardLabel('consistency', mode)}>
        <ConsistencyCard consistency={insights.consistency} />
      </GatedCard>

      <StallWatchStrip insights={insights} staleWelcomeBack={gating.staleWelcomeBack} />

      <GatedCard gate={gates.muscle_balance} title={insightCardLabel('muscleBalance', mode)}>
        <MuscleSetsCard insights={insights} range={range} />
      </GatedCard>

      <GatedCard gate={gates.effort} title={insightCardLabel('effort', mode)}>
        <CalibrationCard calibration={insights.calibration} />
      </GatedCard>
    </div>
  )
}

function GatedCard({
  gate,
  title,
  children,
}: {
  gate: InsightGate
  title: string
  children: ReactNode
}) {
  const { isFull } = useExperienceMode()

  if (gate.unlocked) return <>{children}</>
  if (!isFull) return <LockedInsightCard title={title} gate={gate} />

  return (
    <div className="flex flex-col gap-1.5">
      {children}
      <div className="flex items-center gap-2 px-1">
        <Badge color="warning" variant="light" data-testid={`thin-data-${gate.id}`}>
          {thinDataBadgeLabel}
        </Badge>
        <Caption>{gate.requirementTechnical}</Caption>
      </div>
    </div>
  )
}
