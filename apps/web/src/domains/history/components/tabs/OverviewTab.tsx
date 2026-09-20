import { useMemo, useState } from 'react'
import { buildStrengthScoreTrace } from '~/domains/history/lib/strength-score-trace'
import { buildSessionLedgerRows, sessionLedgerTotals } from '~/domains/history/lib/session-ledger'
import { filterToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { insightCardLabel } from '~/domains/history/lib/insight-labels'
import type { HistoryDashboardWithInsights, InsightGating } from '~/domains/history'
import type { InsightGate, InsightGateId } from '~/domains/history/lib/insight-gates'
import type { ProgramOverview } from '~/domains/program'
import { useExperienceMode } from '~/domains/account/components'
import { InspectorLayout } from '~/components'
import { StrengthScoreTracePanel } from '../inspector/StrengthScoreTracePanel'
import { GatedInsight } from '../overview/GatedInsight'
import { EffortCell } from '../overview/EffortCell'
import { LockedInsightCell } from '../overview/LockedInsightCell'
import { MuscleBalanceCell } from '../overview/MuscleBalanceCell'
import { OverviewColdStart, OverviewEmpty, OverviewWelcomeBack } from '../overview/OverviewColdStart'
import { OverviewFooterRule } from '../overview/OverviewFooterRule'
import { OverviewSignalRow } from '../overview/OverviewSignalRow'
import { OverviewStatStrip } from '../overview/OverviewStatStrip'
import { ShowingUpCell } from '../overview/ShowingUpCell'
import { StrengthTrendCard } from '../overview/StrengthTrendCard'
import { WeeklyVolumeCard } from '../overview/WeeklyVolumeCard'
import type { HistoryTab } from '../insight-format'

/** The figures that can be traced. A union of one: only the score has a derivation worth showing. */
type OverviewFigure = 'strength_score'

export function OverviewTab({
  data,
  gating,
  gates,
  range,
  programOverview,
  activeProgramTitle,
  onNavigate,
}: {
  data: HistoryDashboardWithInsights
  gating: InsightGating
  gates: Record<InsightGateId, InsightGate>
  range: InsightRange
  programOverview: ProgramOverview | null
  activeProgramTitle?: string | null
  onNavigate: (tab: HistoryTab) => void
}) {
  const { mode, isFull, showFormulas } = useExperienceMode()
  const { insights } = data
  // Full arrives with the score selected, the way the design shows it — an empty rail on arrival
  // just costs a column.
  const [figure, setFigure] = useState<OverviewFigure | null>(isFull ? 'strength_score' : null)

  const scoreTrace = useMemo(
    () =>
      buildStrengthScoreTrace({
        score: insights.strengthScore,
        liftSeries: insights.liftSeries,
        entries: insights.bodyweight.entries,
        sex: insights.bodyweight.sex,
        today: insights.today,
        units: insights.units,
      }),
    [insights],
  )

  // Average session length over the range, from the rows the ledger already builds.
  const averageMinutes = useMemo(() => {
    const inRange = filterToRange(data.recentSessions, range, {
      firstDataDate: insights.firstSessionDate,
      now: insights.today,
      getDate: (session) => session.scheduledDate,
    })
    return sessionLedgerTotals(buildSessionLedgerRows({ sessions: inRange, liftSeries: insights.liftSeries })).averageMinutes
  }, [data.recentSessions, insights, range])

  if (gating.lifecycle === 'empty') {
    return (
      <div className="flex flex-col gap-4">
        <OverviewEmpty activeProgramTitle={activeProgramTitle} />
        <OverviewFooterRule insights={insights} range={range} completedSessions={data.overview.completedSessions} />
      </div>
    )
  }

  const latestSession = data.recentSessions[0]
  const inspector =
    isFull && figure === 'strength_score' && scoreTrace ? (
      <StrengthScoreTracePanel trace={scoreTrace} showFormulas={showFormulas} />
    ) : null

  return (
    <InspectorLayout inspector={inspector}>
      <div className="flex flex-col gap-5">
        <OverviewStatStrip
          data={data}
          gating={gating}
          gate={gates.strength_score}
          range={range}
          averageMinutes={averageMinutes}
          selectedFigure={figure}
          onSelectScore={scoreTrace ? () => setFigure((current) => (current === 'strength_score' ? null : 'strength_score')) : undefined}
        />

        {gating.lifecycle === 'cold_start' ? (
          <OverviewColdStart gates={gates} />
        ) : (
          <>
            {gating.staleWelcomeBack ? (
              <OverviewWelcomeBack latestTrainingDate={data.overview.latestTrainingDate ?? latestSession?.scheduledDate ?? null} />
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <GatedInsight gate={gates.strength_trend} title={insightCardLabel('liftTrend', mode)}>
                <StrengthTrendCard insights={insights} range={range} onNavigate={onNavigate} />
              </GatedInsight>
              <GatedInsight gate={gates.volume_trend} title={insightCardLabel('volumeWeekly', mode)}>
                <WeeklyVolumeCard insights={insights} gating={gating} range={range} />
              </GatedInsight>
            </div>

            <OverviewSignalRow>
              <GatedInsight
                gate={gates.consistency}
                title={insightCardLabel('consistency', mode)}
                locked={<LockedInsightCell title={insightCardLabel('consistency', mode)} gate={gates.consistency} />}
              >
                <ShowingUpCell
                  consistency={insights.consistency}
                  plannedPerWeek={programOverview?.position?.daysPerWeek ?? null}
                />
              </GatedInsight>
              <GatedInsight
                gate={gates.muscle_balance}
                title="Muscle balance"
                locked={<LockedInsightCell title="Muscle balance" gate={gates.muscle_balance} />}
              >
                <MuscleBalanceCell insights={insights} range={range} />
              </GatedInsight>
              <GatedInsight
                gate={gates.effort}
                title={insightCardLabel('effort', mode)}
                locked={<LockedInsightCell title={insightCardLabel('effort', mode)} gate={gates.effort} />}
              >
                <EffortCell calibration={insights.calibration} />
              </GatedInsight>
            </OverviewSignalRow>
          </>
        )}

        <OverviewFooterRule
          insights={insights}
          range={range}
          completedSessions={data.overview.completedSessions}
          lastSession={
            latestSession
              ? { date: latestSession.scheduledDate, durationMinutes: latestSession.durationMinutes }
              : null
          }
        />
      </div>
    </InspectorLayout>
  )
}
