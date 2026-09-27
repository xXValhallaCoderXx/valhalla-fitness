import { Pressable, View } from 'react-native'
import { availableIntensities, hasAdHocSessions, intensityColor } from '@sheetless/domain/history/insights'
import { recentWorkoutDates, selectSessionPage, workoutCompletion, workoutCompletionLabels, type SessionBrowserState } from '@sheetless/domain/history/session-browser'
import type { RecentHistoryEntry } from '@sheetless/domain/history/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Badge, Button, Caption, EmptyState, Panel, SectionLabel, SegmentedControl, Text, TextInput } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { useInsightsState } from '../navigation/InsightsState'

export function InsightsSessions({ sessions, today, units, onOpen }: {
  sessions: RecentHistoryEntry[]; today: string; units: Unit | null; onOpen: (sessionId: string) => void
}) {
  const { state, update } = useInsightsState()
  const { theme } = useTokens()
  const change = (patch: Partial<SessionBrowserState>) => update({ sessions: { ...state.sessions, page: 0, ...patch } })
  const page = selectSessionPage(sessions, state.sessions, state.range, today)
  const dates = recentWorkoutDates(sessions, today)
  return <>
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>Last two weeks</SectionLabel>
      <Caption>{dates.reduce((sum, date) => sum + date.count, 0)} loaded workouts · Tap a date to filter; tap it again to clear.</Caption>
      <View style={{ gap: spacing.xs }}>
        {[dates.slice(0, 7), dates.slice(7)].map((week, index) => <View key={index} style={{ flexDirection: 'row', gap: 2 }}>
          {week.map(day => <Pressable key={day.date} accessibilityRole="button"
            accessibilityLabel={`${day.date}, ${day.count} workouts`} accessibilityState={{ selected: state.sessions.date === day.date }}
            onPress={() => change({ date: state.sessions.date === day.date ? null : day.date })}
            style={{ flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 3,
              borderRadius: 8, backgroundColor: state.sessions.date === day.date ? theme.tones.action.soft : theme.surfaceInset }}>
            <Caption>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${day.date}T00:00:00Z`).getUTCDay()]}</Caption>
            <Text weight={day.count ? 900 : 500}>{Number(day.date.slice(-2))}</Text>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: day.count ? theme.tones.action.text : 'transparent' }} />
          </Pressable>)}
        </View>)}
      </View>
      {state.sessions.date ? <Button label={`Clear date · ${state.sessions.date}`} variant="subtle" onPress={() => change({ date: null })} /> : null}
    </Panel>
    <TextInput value={state.sessions.query} onChangeText={query => change({ query })}
      placeholder="Search loaded workouts" accessibilityLabel="Search workouts" />
    <SegmentedControl options={[{ value: 'all', label: 'All' }, { value: 'finished', label: 'Finished' }, { value: 'cut_short', label: 'Cut short' }]}
      value={state.sessions.completion} onChange={completion => change({ completion })} variant="segments" accessibilityLabel="Workout completion filter" />
    <SegmentedControl options={[{ value: 'all' as const, label: 'Any intensity' },
      ...availableIntensities(sessions).map(value => ({ value, label: value })),
      ...(hasAdHocSessions(sessions) ? [{ value: 'adhoc' as const, label: 'Ad-hoc' }] : [])]}
      value={state.sessions.intensity} onChange={intensity => change({ intensity })} accessibilityLabel="Session intensity filter" />
    <Caption>{page.total} matching workouts · {sessions.length} loaded. Search and filters apply before pages of 20.</Caption>
    {page.rows.length === 0 ? <EmptyState title="No matching workouts">Try a wider range or clear a filter.</EmptyState> : null}
    {page.rows.map(session => {
      const completion = workoutCompletion(session)
      return <Pressable key={session.id} accessibilityRole="button" accessibilityLabel={`Open ${session.title}, ${session.scheduledDate}`}
        onPress={() => onOpen(session.id)}>
        {({ pressed }) => <Panel style={{ gap: spacing.xs, padding: spacing.md, opacity: pressed ? 0.7 : 1 }}>
          <Text weight={800}>{session.title}</Text>
          <Caption>{formatCompactDate(session.scheduledDate)}{session.durationMinutes !== null ? ` · ${session.durationMinutes} min` : ''} · {formatWeight(session.tonnage, units)} moved</Caption>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <Badge tone={completion === 'finished' ? 'success' : 'neutral'}>{workoutCompletionLabels[completion]}</Badge>
            {session.hardness || session.isAdHoc ? <Badge tone={intensityColor(session.hardness)}>{session.hardness ?? 'Ad-hoc'}</Badge> : null}
          </View>
          <Caption>{session.recordedSetCount == null ? `${session.completedSetCount} sets logged` : `${session.completedSetCount}/${session.recordedSetCount} sets logged`} · Open recap</Caption>
        </Panel>}
      </Pressable>
    })}
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
      <Button label="Newer" variant="default" disabled={page.page === 0} onPress={() => change({ page: page.page - 1 })} />
      <Caption>Page {page.page + 1} of {page.pages}</Caption>
      <Button label="Older" variant="default" disabled={page.page + 1 >= page.pages} onPress={() => change({ page: page.page + 1 })} />
    </View>
    <Caption>Finished means every saved set row was completed. Cut short means some were left unlogged. Empty and unknown-count workouts remain visible under All.</Caption>
  </>
}
