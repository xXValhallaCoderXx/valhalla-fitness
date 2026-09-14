import { useState } from 'react'
import { buildStrengthScoreTrace } from '~/domains/history/lib/strength-score-trace'
import { selectScoreDelta } from '~/domains/history/lib/insight-selectors'
import { strengthScoreKindLabels } from '~/domains/history/lib/dots'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import type { HistoryInsights, InsightGating } from '~/domains/history'
import type { ProgramOverview } from '~/domains/program'
import { useExperienceMode } from '~/domains/account/components'
import { EmptyState, InspectorLayout, Panel, Text } from '~/components'
import { StrengthScoreTracePanel } from '../inspector/StrengthScoreTracePanel'
import { InsightTabHeader } from '../insights/InsightTabHeader'
import { StrengthScoreChart } from '../strength/StrengthScoreChart'
import { StrengthScoreStrip } from '../strength/StrengthScoreStrip'
import { TrainingHealthRow } from '../strength/TrainingHealthRow'
import { LiftTrendCard } from '../cards/LiftTrendCard'
import { StallWatchStrip } from '../cards/StallWatchStrip'
import { formatNumber } from '../insight-format'

/**
 * Strength: the score, and every lift behind it.
 *
 * Full docks the score's derivation, the same trace the Overview strip opens — one figure, one
 * explanation, wherever you meet it.
 */
export function StrengthTab({
  insights,
  gating,
  range,
  programOverview,
  completedSessions,
}: {
  insights: HistoryInsights
  gating: InsightGating
  range: InsightRange
  programOverview: ProgramOverview | null
  completedSessions: number
}) {
  const { isFull, showFormulas } = useExperienceMode()
  const [traced, setTraced] = useState(isFull)

  const scoreTrace = buildStrengthScoreTrace({
    score: insights.strengthScore,
    liftSeries: insights.liftSeries,
    entries: insights.bodyweight.entries,
    sex: insights.bodyweight.sex,
    today: insights.today,
    units: insights.units,
  })

  // Training maxes are keyed by movement, so a lift only shows one when the programme programmes
  // off it — `buildLiftStats` drops the cell otherwise.
  const trainingMaxes = new Map(
    (programOverview?.stateValues ?? [])
      .filter((state) => state.stateType === 'training_max')
      .map((state) => [
        state.movementId,
        { value: state.value, updatedAt: state.updatedAt ?? null, changedBy: round(state.value - state.startValue) },
      ]),
  )

  if (insights.lifetime.sessions === 0) {
    return (
      <EmptyState centered title="No strength history yet">
        Complete workouts with logged loads and reps to build strength trends.
      </EmptyState>
    )
  }

  const delta = selectScoreDelta(insights, range)

  return (
    <div>
      <InsightTabHeader
        title="Strength"
        subtitle={
          isFull
            ? [
                `${strengthScoreKindLabels[insights.strengthScore.kind]} · ${insights.liftSeries.length} lift${insights.liftSeries.length === 1 ? '' : 's'} tracked`,
                delta === null ? null : `${delta > 0 ? '+' : ''}${formatNumber(delta)} in range`,
              ]
                .filter(Boolean)
                .join(' · ')
            : 'How your main lifts are going.'
        }
      />

      <InspectorLayout
        inspector={
          isFull && traced && scoreTrace ? (
            <StrengthScoreTracePanel trace={scoreTrace} showFormulas={showFormulas} />
          ) : null
        }
      >
        <div className="flex flex-col gap-5">
          <StrengthScoreStrip
            insights={insights}
            range={range}
            completedSessions={completedSessions}
            selected={traced}
            onSelect={scoreTrace ? () => setTraced((open) => !open) : undefined}
          />
          <StrengthScoreChart insights={insights} range={range} />
          <TrainingHealthRow insights={insights} gating={gating} />
          <StallWatchStrip insights={insights} staleWelcomeBack={gating.staleWelcomeBack} />

          {insights.liftSeries.length ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {insights.liftSeries.map((series) => (
                <LiftTrendCard
                  key={series.movementId}
                  series={series}
                  insights={insights}
                  gating={gating}
                  range={range}
                  trainingMax={trainingMaxes.get(series.movementId) ?? null}
                />
              ))}
            </div>
          ) : (
            <Panel p="md">
              <Text size="sm" tone="dimmed">
                Strength lift trends unlock after loaded sets for squat, bench press, deadlift, overhead press, or
                barbell row.
              </Text>
            </Panel>
          )}
        </div>
      </InspectorLayout>
    </div>
  )
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
