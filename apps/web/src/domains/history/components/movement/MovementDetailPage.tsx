import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { EmptyState, InspectorLayout, Page, PageHeader, PageLoadError, PageSkeleton } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { historyDashboardQueryOptions } from '~/domains/history/queries'
import { buildE1rmTrace } from '~/domains/history/lib/e1rm-trace'
import { filterToRange, type InsightRange } from '~/domains/history/lib/insight-ranges'
import { LoadTracePanel } from '~/domains/program/components/inspector/LoadTracePanel'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { InsightRangeSwitch } from '../InsightRangeSwitch'
import { MovementRepRecords } from './MovementRepRecords'
import { MovementStats, buildMovementStats } from './MovementStats'
import { MovementTrendChart } from './MovementTrendChart'

/**
 * One lift over time.
 *
 * Everything is derived from the history dashboard and programme overview, both of which the route
 * loader already warms — no per-movement query. That also bounds the screen: only the five lifts
 * `buildLiftE1rmSeries` tracks have a per-session series, which is why the movements list links
 * just those.
 */
export function MovementDetailPage({
  user,
  movementId,
  initialRange,
}: {
  user: AuthUser | null
  movementId: string
  initialRange?: InsightRange
}) {
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to see this lift">Movement history is account data.</EmptyState>
      </Page>
    )
  }
  return <AuthedMovementDetail movementId={movementId} initialRange={initialRange} />
}

function AuthedMovementDetail({
  movementId,
  initialRange,
}: {
  movementId: string
  initialRange?: InsightRange
}) {
  const userId = useRequiredAccountId()
  const { mode, isFull, showFormulas } = useExperienceMode()
  const [range, setRange] = useState<InsightRange>(initialRange ?? '8w')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const historyQuery = useQuery(historyDashboardQueryOptions(userId))
  const overviewQuery = useQuery(programOverviewQueryOptions(userId))

  if (historyQuery.isPending) return <PageSkeleton compact />
  if (historyQuery.isError) {
    return <PageLoadError error={historyQuery.error} onRetry={() => void historyQuery.refetch()} />
  }

  const { insights } = historyQuery.data
  const series = insights.liftSeries.find((lift) => lift.movementId === movementId)

  if (!series) {
    return (
      <Page>
        <EmptyState title="No strength history for this movement">
          Per-session estimates are tracked for the main barbell lifts. Log loaded sets of one to
          see it here.
        </EmptyState>
      </Page>
    )
  }

  const points = filterToRange(series.points, range, {
    firstDataDate: insights.firstSessionDate,
    now: insights.today,
    getDate: (point) => point.date,
  })
  const trainingMax =
    overviewQuery.data?.stateValues.find(
      (state) => state.movementId === movementId && state.stateType === 'training_max',
    )?.value ?? null

  const selected = points.find((point) => point.sessionId === selectedSessionId) ?? null
  const trace = selected
    ? buildE1rmTrace({ point: selected, movementName: series.movementName, units: insights.units ?? 'kg' })
    : null

  return (
    <Page>
      <PageHeader title={series.movementName} eyebrow="Insights">
        {mode === 'guided' ? 'How this lift has been going.' : `Per-session e1RM · ${points.length} in range`}
      </PageHeader>

      <div className="mb-3 flex justify-end">
        <InsightRangeSwitch value={range} onChange={setRange} />
      </div>

      <InspectorLayout
        inspector={trace ? <LoadTracePanel trace={trace} showFormulas={showFormulas} /> : null}
      >
        <div className="space-y-4">
          <MovementStats
            stats={buildMovementStats({
              points,
              trainingMax,
              units: insights.units,
              guided: mode === 'guided',
            })}
          />
          <MovementTrendChart
            points={points}
            trainingMax={trainingMax}
            units={insights.units}
            onSelectPoint={isFull ? (point) => setSelectedSessionId(point.sessionId) : undefined}
            selectedSessionId={selectedSessionId}
          />
          <MovementRepRecords bests={series.repMaxBests} units={insights.units} guided={mode === 'guided'} />
        </div>
      </InspectorLayout>
    </Page>
  )
}
