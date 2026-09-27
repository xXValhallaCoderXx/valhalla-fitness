import { View } from 'react-native'
import { router } from 'expo-router'
import type { EndedProgramSummary } from '@sheetless/domain/program/ending'
import { calendarDateInTimeZone } from '@sheetless/domain/shared/calendar-date'
import { formatFullDate } from '@sheetless/domain/shared/dates'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { StartBlankWorkoutButton } from './StartBlankWorkoutButton'

export function TodayNoPlan({ ended, hasHistory, timeZone }: { ended?: EndedProgramSummary | null; hasHistory: boolean; timeZone?: string | null }) {
  return <>
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <SectionLabel>{ended ? 'What’s next' : 'Start here'}</SectionLabel>
      <Heading order={2}>{ended ? 'Your plan has ended' : hasHistory ? 'No active program' : 'Pick a plan and we do the maths'}</Heading>
      {ended ? <Text size="sm" tone="dimmed">{ended.title} · ended {formatFullDate(calendarDateInTimeZone(new Date(ended.endedAt), timeZone))}. Your workouts and records are saved.</Text>
        : <View style={{ gap: spacing.sm }}>
          <Text size="sm"><Text weight={800} size="sm">1  Choose a plan</Text>{'\n'}Three questions, or browse the library yourself.</Text>
          <Text size="sm"><Text weight={800} size="sm">2  Get every weight worked out</Text>{'\n'}Your starting numbers help set your first targets.</Text>
          <Text size="sm"><Text weight={800} size="sm">3  Train, and keep moving forward</Text>{'\n'}Log your sets, then review suggested changes.</Text>
        </View>}
      <Button label="Find my plan" fullWidth onPress={() => router.push('/templates/find')} testID="today-find-plan" />
      <Button label="Browse all plans" fullWidth variant="default" onPress={() => router.navigate('/templates')} testID="today-browse-programs" />
    </Panel>
    {!ended ? <Panel style={{ padding: spacing.md, gap: spacing.xs }}>
      <Text weight={800}>Know roughly what you lift?</Text>
      <Caption>Save optional estimates for future plan setup. Recorded lifts take priority.</Caption>
      <Button label="Add starting numbers" variant="subtle" onPress={() => router.push({ pathname: '/settings', params: { section: 'starting-numbers' } })} />
    </Panel> : null}
    <Panel style={{ padding: spacing.md, gap: spacing.xs }}>
      <Text weight={800}>Just want to train today?</Text>
      <Caption>A blank workout counts toward your history and records. Pick a plan whenever you like.</Caption>
      <StartBlankWorkoutButton />
    </Panel>
  </>
}
