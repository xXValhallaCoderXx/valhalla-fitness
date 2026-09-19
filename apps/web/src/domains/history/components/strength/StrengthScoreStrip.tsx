import { Badge } from '@mantine/core'
import { selectScoreDelta } from '~/domains/history/lib/insight-selectors'
import { strengthScoreKindLabels } from '~/domains/history/lib/dots'
import { insightCardLabel } from '~/domains/history/lib/insight-labels'
import type { InsightRange } from '~/domains/history/lib/insight-ranges'
import type { HistoryInsights, StrengthScoreKind } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { Text } from '~/components'
import { BodyweightPromptCard } from '../BodyweightPromptCard'
import { InsightStatCell } from '../insights/InsightStatCell'
import { InsightStatStrip } from '../insights/InsightStatStrip'
import { formatLoad, formatNumber } from '../insight-format'

const SCORE_BADGE_COLOR: Record<StrengthScoreKind, string> = {
  dots: 'success',
  bw_multiple: 'action',
  total: 'warning',
  insufficient: 'neutral',
}

/**
 * The score, what it is made of, and how far it has moved.
 *
 * The kind badge stays: it is the only place the screen names the metric actually in force, and a
 * DOTS score and a raw total look identical without it.
 */
export function StrengthScoreStrip({
  insights,
  range,
  completedSessions,
  selected,
  onSelect,
}: {
  insights: HistoryInsights
  range: InsightRange
  completedSessions: number
  selected: boolean
  onSelect?: () => void
}) {
  const { mode, isFull } = useExperienceMode()
  const score = insights.strengthScore
  const delta = selectScoreDelta(insights, range)
  const hasBodyweight = insights.bodyweight.entries.length > 0
  const hasSex = insights.bodyweight.sex !== null
  const showPrompt = (!hasBodyweight || !hasSex) && completedSessions >= 2

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Badge color={SCORE_BADGE_COLOR[score.kind]} variant="light">
          {strengthScoreKindLabels[score.kind]}
        </Badge>
      </div>

      <InsightStatStrip
        cells={[
          <InsightStatCell
            key="score"
            label={insightCardLabel('strengthScore', mode)}
            value={formatScore(score.kind, score.value, insights.units)}
            subline={scoreCaption(score.kind)}
            selected={selected}
            onSelect={onSelect}
          />,
          <InsightStatCell
            key="total"
            label={isFull ? 'Total' : 'Three lifts together'}
            value={score.total === null ? '—' : formatLoad(score.total, insights.units)}
            subline={
              score.bodyweightKg === null
                ? 'squat + bench + deadlift'
                : `at ${formatNumber(score.bodyweightKg)} kg bodyweight`
            }
          />,
          <InsightStatCell
            key="change"
            label="Change in range"
            value={
              delta === null ? (
                '—'
              ) : (
                <Text component="span" size="inherit" fw="inherit" tone={delta < 0 ? 'warning' : 'success'}>
                  {delta > 0 ? '+' : ''}
                  {formatNumber(delta)}
                </Text>
              )
            }
            subline={delta === null ? 'two scored sessions needed' : 'across the selected range'}
          />,
        ]}
      />

      {showPrompt ? (
        <BodyweightPromptCard units={insights.bodyweight.units} hasBodyweight={hasBodyweight} hasSex={hasSex} />
      ) : null}
    </div>
  )
}

function formatScore(kind: StrengthScoreKind, value: number | null, units: HistoryInsights['units']) {
  if (value === null) return '—'
  if (kind === 'dots') return formatNumber(value)
  if (kind === 'bw_multiple') return `${formatNumber(value)}×`
  if (kind === 'total') return formatLoad(value, units)
  return '—'
}

function scoreCaption(kind: StrengthScoreKind) {
  if (kind === 'dots') return 'Powerlifting total adjusted for bodyweight.'
  if (kind === 'bw_multiple') return 'Add sex to convert this bodyweight multiple into DOTS.'
  if (kind === 'total') return 'Add bodyweight to compare strength relative to size.'
  return 'Squat, bench, and deadlift all need logged loaded work.'
}
