import { Pressable, View } from 'react-native'
import { Check, ChevronRight, Circle } from 'lucide-react-native'
import type { ProgramPlanSession, ProgramPlanWeek } from '@sheetless/domain/program/program-plan'
import { Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function PlanWeekSessions({ week, advanced, onSelect }: {
  week: ProgramPlanWeek; advanced: boolean; onSelect: (session: ProgramPlanSession) => void
}) {
  const { theme } = useTokens()
  return <Panel style={{ padding: spacing.md }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4, paddingBottom: spacing.xs }}>
      <SectionLabel>{week.status === 'current' ? 'This week' : `Week ${week.number}`}</SectionLabel>
      <Caption>{week.sessionsDone} of {week.sessionsTotal} done{advanced && week.completedSetCount != null && week.plannedSetCount != null
        ? ` · ${week.completedSetCount}/${week.plannedSetCount} sets` : ''}</Caption>
    </View>
    {week.sessions.map(session => {
      const done = session.status === 'completed' || session.status === 'unavailable'
      const next = session.status === 'next'
      return <Pressable key={session.globalIndex} accessibilityRole="button"
        accessibilityLabel={`${session.title}, ${next ? 'next up' : done ? 'completed' : 'upcoming'}${session.status === 'unavailable' ? ', saved details unavailable' : ''}`}
        onPress={() => onSelect(session)} style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingVertical: 8,
          borderTopWidth: 1, borderColor: theme.border, opacity: pressed ? 0.7 : 1,
        })}>
        {!advanced ? done ? <Check size={18} color={theme.tones.success.text} />
          : next ? <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: theme.primaryFill }} />
            : <Circle size={16} color={theme.border} /> : null}
        <View style={{ flex: 1 }}><Text size="sm" weight={next ? 800 : 600} tone={next ? 'action' : 'default'}>{session.title}</Text>
          {session.status === 'unavailable' ? <Caption>Saved details unavailable</Caption> : null}</View>
        <Text size="xs" weight={800} tone={done ? 'success' : next ? 'action' : 'dimmed'}>
          {next ? `NEXT${advanced && session.plannedSetCount != null ? ` · ${session.plannedSetCount}` : ''}`
            : advanced && session.completedSetCount != null && session.plannedSetCount != null
              ? `${session.completedSetCount}/${session.plannedSetCount}` : ''}
        </Text>
        <ChevronRight size={15} color={theme.textMuted} />
      </Pressable>
    })}
  </Panel>
}
