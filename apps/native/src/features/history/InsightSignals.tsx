import { View } from 'react-native'
import { buildMovementBalance, balanceSignalLabels } from '@sheetless/domain/history/muscle-volume'
import { detectStall, stallSignalLabels } from '@sheetless/domain/history/strength'
import type {
  HistoryInsights,
  InsightGating,
  StallSignal,
} from '@sheetless/domain/history/types'
import { Badge, Caption, Panel, SectionLabel, Text } from '@/components'
import { radii, spacing, useTokens, type ToneName } from '@/lib/tokens'

const MAX_MILESTONES = 4

const stallTones: Record<StallSignal, ToneName> = {
  progressing: 'success',
  watch: 'warning',
  stalled: 'danger',
  insufficient: 'neutral',
}

export function InsightSignals({
  insights,
  gating,
}: {
  insights: HistoryInsights
  gating: InsightGating
}) {
  return (
    <>
      <Milestones insights={insights} />
      <PrWatch insights={insights} gating={gating} />
      <MuscleBalance insights={insights} />
    </>
  )
}

function Milestones({ insights }: { insights: HistoryInsights }) {
  const earned = insights.milestones.earned.slice(-MAX_MILESTONES)
  const next = insights.milestones.nextUp
  if (!earned.length && !next) return null

  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>Milestones · recent training</SectionLabel>
      {earned.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {earned.map((milestone) => (
            <Badge key={`${milestone.kind}-${milestone.threshold}`} tone="warning">
              Earned · {milestone.label}
            </Badge>
          ))}
        </View>
      ) : null}
      {next ? (
        <ProgressBar
          label={`Next · ${next.label}`}
          value={next.progressPercent}
          valueLabel={`${next.progressPercent}%`}
          tone="warning"
        />
      ) : null}
    </Panel>
  )
}

function PrWatch({ insights, gating }: { insights: HistoryInsights; gating: InsightGating }) {
  if (gating.staleWelcomeBack) return null
  const statuses = insights.liftSeries
    .map((series) => ({
      id: series.movementId,
      label: series.movementName,
      status: detectStall(series.points, insights.today),
    }))
    .filter((item) => item.status.signal !== 'insufficient')
  if (!statuses.length) return null

  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <SectionLabel>PR watch · recent training</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {statuses.map((item) => (
          <Badge key={item.id} tone={stallTones[item.status.signal]}>
            {item.label} · {stallSignalLabels[item.status.signal]}
          </Badge>
        ))}
      </View>
      <Caption>Weeks since each big lift set a new estimated-max best.</Caption>
    </Panel>
  )
}

function MuscleBalance({ insights }: { insights: HistoryInsights }) {
  const balance = buildMovementBalance(insights.weeklyRegionSets, null)
  if (balance.signal === 'insufficient') {
    return (
      <Panel style={{ gap: spacing.xs, padding: spacing.md }}>
        <SectionLabel>Muscle balance · recent training</SectionLabel>
        <Caption>Muscle balance appears after about 20 logged sets.</Caption>
      </Panel>
    )
  }

  const groups: Array<{ label: string; sets: number; tone: ToneName }> = [
    { label: 'Push', sets: balance.pushSets, tone: 'action' },
    { label: 'Pull', sets: balance.pullSets, tone: 'accent' },
    { label: 'Legs', sets: balance.legSets, tone: 'success' },
    { label: 'Core', sets: balance.coreSets, tone: 'warning' },
  ]
  const max = Math.max(1, ...groups.map((group) => group.sets))

  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
        <SectionLabel>Muscle balance · recent training</SectionLabel>
        <Badge tone={balance.signal === 'balanced' ? 'success' : 'warning'}>
          {balanceSignalLabels[balance.signal]}
        </Badge>
      </View>
      {groups.map((group) => (
        <ProgressBar
          key={group.label}
          label={group.label}
          value={(group.sets / max) * 100}
          valueLabel={`${group.sets} sets`}
          tone={group.tone}
        />
      ))}
      <Caption>{balance.totalSets} sets across {balance.weeks} {balance.weeks === 1 ? 'week' : 'weeks'}.</Caption>
    </Panel>
  )
}

function ProgressBar({
  label,
  value,
  valueLabel,
  tone,
}: {
  label: string
  value: number
  valueLabel: string
  tone: ToneName
}) {
  const { theme } = useTokens()
  const width = `${Math.max(0, Math.min(100, Math.round(value)))}%` as `${number}%`
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
        <Text size="sm" weight={700}>{label}</Text>
        <Caption>{valueLabel}</Caption>
      </View>
      <View style={{ backgroundColor: theme.surfaceInset, borderRadius: radii.xl, height: 7, overflow: 'hidden' }}>
        <View style={{ backgroundColor: theme.tones[tone].text, borderRadius: radii.xl, height: 7, width }} />
      </View>
    </View>
  )
}
