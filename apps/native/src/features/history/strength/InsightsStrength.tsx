import type { User } from '@supabase/supabase-js'
import type { HistoryInsights, InsightGating } from '@sheetless/domain/history/types'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import { Caption, EmptyState } from '@/components'
import { StrengthScorePanel } from './StrengthScorePanel'
import { LiftTrendPanel } from './LiftTrendPanel'
import { StrengthMethod } from './StrengthMethod'
import { PrWatch } from '../overview/InsightSignals'
import { TrainingHealth } from '../overview/TrainingHealth'

export function InsightsStrength({ insights, gating, range, user, advanced = false, onOpenSession }: {
  insights: HistoryInsights; gating: InsightGating; range: InsightRange; user: User; advanced?: boolean; onOpenSession: (id: string) => void
}) {
  if (gating.lifecycle === 'empty') return <EmptyState title="No strength history yet">Log loaded sets to build strength trends.</EmptyState>
  return <>
    <StrengthScorePanel insights={insights} gating={gating} range={range} user={user} advanced={advanced} />
    <StrengthMethod insights={insights} advanced={advanced} onOpenSession={onOpenSession} />
    <TrainingHealth insights={insights} gating={gating} />
    {insights.liftSeries.map((series) => <LiftTrendPanel key={series.movementId} series={series} insights={insights} gating={gating} range={range} advanced={advanced} onOpenSession={onOpenSession} />)}
    {advanced ? <PrWatch insights={insights} gating={gating} /> : null}
    {!insights.liftSeries.length ? <Caption>Lift trends unlock with loaded squat, bench press, deadlift, overhead press, or barbell row sets.</Caption> : null}
  </>
}
