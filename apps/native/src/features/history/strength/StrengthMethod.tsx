import { useState } from 'react'
import { selectPowerliftingComponents } from '@sheetless/domain/history/strength'
import type { HistoryInsights } from '@sheetless/domain/history/types'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function StrengthMethod({ insights, advanced, onOpenSession }: {
  insights: HistoryInsights; advanced: boolean; onOpenSession: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const sources = selectPowerliftingComponents(insights.liftSeries, insights.strengthScore.asOfDate)
  return <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
    <SectionLabel>Behind your strength</SectionLabel>
    {sources?.map(source => <Button key={source.liftId} variant="subtle"
      label={`${source.liftLabel} · ${formatWeight(source.point.e1rm, insights.units)} · ${source.point.date}`}
      onPress={() => onOpenSession(source.point.sessionId)} />)}
    {!sources ? <Caption>All three source lifts must have a usable estimate before a total is available.</Caption> : null}
    <Button label={expanded ? 'Hide methodology' : 'How it is calculated'} variant="subtle" onPress={() => setExpanded(value => !value)} />
    {expanded || advanced ? <>
      <Text size="sm">Estimated max uses Epley: load × (1 + (reps + reps in reserve) ÷ 30). Strength charts use loaded sets of 1–12 reps. A missing effort is treated as zero reps in reserve.</Text>
      <Caption>DOTS uses the supported sex-specific curve and a bodyweight measurement. Otherwise the score falls back to a bodyweight multiple, then the total. Each source is the best usable estimate on or before the total’s date.</Caption>
      <Caption>After three accepted workout observations, an estimate above 1.5 × the median of the previous five is flagged as unusual. Every set uses the same threshold for that workout. Unusual sets stay in your logs but do not contribute to estimated records, score or trend readiness.</Caption>
    </> : null}
  </Panel>
}
