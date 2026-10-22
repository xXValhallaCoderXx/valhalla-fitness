import { View, useWindowDimensions } from 'react-native'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import type { TodayHistorySupport } from '@sheetless/domain/history/types'
import { Button, Caption, Panel, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function TodayWeekSummary({ data, mode, plannedDays, loading, error, onRetry, onOpenMuscles }: {
  data?: TodayHistorySupport
  mode: ExperienceMode
  plannedDays?: number
  loading: boolean
  error: boolean
  onRetry: () => void
  onOpenMuscles: () => void
}) {
  const { theme } = useTokens()
  const { width, fontScale } = useWindowDimensions()
  const compact = width < 360 || fontScale > 1.2
  const muscleAction = <Button label="View muscle workload and fatigue" variant="subtle" onPress={onOpenMuscles} />
  if (error) return <Panel style={{ padding: spacing.md, gap: spacing.xs }}>
    <Text size="sm" tone="dimmed">Your week could not load. Your workout is still ready.</Text>
    <Button label="Retry weekly summary" variant="subtle" onPress={onRetry} loading={loading} />
    {muscleAction}
  </Panel>
  const week = data?.calendarWeek
  if (!week) return <Panel style={{ padding: spacing.md, gap: spacing.xs }}>
    {loading ? <Caption>Loading your week…</Caption> : null}
    {muscleAction}
  </Panel>
  const advanced = mode === 'full'
  const count = plannedDays ? `${week.completedSessions} of ${plannedDays} done` : `${week.completedSessions} workouts`
  const percent = week.volumeChangePercent
  return <Panel style={{ padding: spacing.md, gap: spacing.md }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs }}>
      <Text weight={800}>This week</Text><Text size="sm" weight={700}>{count}</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {week.days.map((day, index) => {
        const current = day.date === week.today
        const done = day.completedSessions > 0
        return <View key={day.date} accessible accessibilityLabel={`${day.date}: ${day.completedSessions} completed workouts${current ? ', today' : ''}`}
          style={{ flex: 1, alignItems: 'center', gap: 7 }}>
          <Text size="xs" weight={current ? 800 : 500} tone={current ? 'action' : 'dimmed'}>{current && fontScale <= 1.2 ? 'Today' : ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
          {advanced ? <View style={{ height: 6, width: '100%', borderRadius: radii.sm, backgroundColor: done ? theme.primaryFill : current ? theme.text : theme.border }} />
            : <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: current ? 3 : 1,
              borderColor: current ? theme.primaryFill : done ? theme.primaryFill : theme.border,
              backgroundColor: done ? theme.primaryFill : theme.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Text weight={800} style={{ color: done ? theme.primaryFillText : theme.textMuted }}>{done ? day.completedSessions > 1 ? day.completedSessions : '✓' : current ? '•' : ' '}</Text>
            </View>}
        </View>
      })}
    </View>
    {advanced ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <WeekMetric compact={compact} value={`${week.completedSessions}${plannedDays ? ` / ${plannedDays}` : ''}`} label="sessions" />
      <WeekMetric compact={compact} value={Math.round(week.volume).toLocaleString('en-US')} label={`${data?.units ?? 'kg'} this week`} />
      <WeekMetric compact={compact} value={percent === null ? '—' : `${percent > 0 ? '+' : ''}${percent}%`} label="vs last full week" />
      <WeekMetric compact={compact} value={String(data?.consistency.currentStreakWeeks ?? 0)} label="week run" />
    </View> : null}
    <Caption>Completed workouts · Monday–Sunday{plannedDays ? ' · target from your current plan' : ''}</Caption>
    {muscleAction}
  </Panel>
}

function WeekMetric({ value, label, compact }: { value: string; label: string; compact: boolean }) {
  return <View style={{ flex: 1, flexBasis: compact ? '45%' : 0, minWidth: 0, gap: 2 }}>
    <Text weight={900} size="lg">{value}</Text><Text size="xs" tone="dimmed">{label}</Text>
  </View>
}
