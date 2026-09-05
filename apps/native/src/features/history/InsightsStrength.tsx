import type { User } from '@supabase/supabase-js'
import type { HistoryInsights, InsightGating } from '@sheetless/domain/history/types'
import type { InsightRange } from '@sheetless/domain/history/insight-ranges'
import { Caption, EmptyState } from '@/components'
import { StrengthScorePanel } from './StrengthScorePanel'
import { LiftTrendPanel } from './LiftTrendPanel'
import { TrainingHealth } from './TrainingHealth'

export function InsightsStrength({ insights, gating, range, user }: {
  insights: HistoryInsights; gating: InsightGating; range: InsightRange; user: User
}) {
  if (gating.lifecycle === 'empty') return <EmptyState title="No strength history yet">Log loaded sets to build strength trends.</EmptyState>
  return <>
    <StrengthScorePanel insights={insights} gating={gating} range={range} user={user} />
    <TrainingHealth insights={insights} gating={gating} />
    {insights.liftSeries.map((series) => <LiftTrendPanel key={series.movementId} series={series} insights={insights} gating={gating} range={range} />)}
    {!insights.liftSeries.length ? <Caption>Lift trends unlock with loaded squat, bench press, deadlift, overhead press, or barbell row sets.</Caption> : null}
  </>
}
