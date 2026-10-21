import { Pressable, View } from 'react-native'
import type { PlannedSession } from '@sheetless/domain/session/types'
import { definingSet } from '@sheetless/domain/program/load-trace'
import { todayMovementPreview } from '@sheetless/domain/session/today-prescription'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function WorkoutMainLift({ session, onOpen }: { session: PlannedSession; onOpen: (id: string) => void }) {
  const { theme } = useTokens()
  const main = session.movements.find(movement => movement.role === 'main') ?? session.movements[0]
  if (!main) return <Caption>No movements planned.</Caption>
  const set = definingSet(main)
  const row = todayMovementPreview(main, session, 'guided')
  const load = set?.targetLoad
  const previous = main.loadSuggestionCutoff ? null : main.previous?.load
  const difference = typeof load === 'number' && load > 0 && typeof previous === 'number' && previous > 0 ? load - previous : null
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`How ${row.name} is worked out`}
      accessibilityHint="Opens every set target and its calculation" onPress={() => onOpen(main.id)}>
      <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.xs, backgroundColor: theme.tones.action.soft, borderColor: theme.tones.action.border }}>
        <SectionLabel tone="action">The big one</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <Heading order={3} style={{ flexShrink: 1 }}>{row.name}</Heading>
          <Text weight={900} style={{ fontSize: 32 }}>{load != null && load > 0 ? formatWeight(load, session.units) : row.loadLabel === 'Bodyweight' ? 'Bodyweight' : 'You choose'}</Text>
        </View>
        <Text size="sm">{row.prescription}</Text>
        {difference !== null && difference !== 0 ? <Text size="xs" tone={difference > 0 ? 'success' : 'dimmed'} weight={700}>
          {difference > 0 ? '+' : '−'}{formatWeight(Math.abs(difference), session.units)} vs your last comparable set
        </Text> : null}
        <Caption>Tap to see every set and how the weight is worked out ›</Caption>
      </Panel>
    </Pressable>
    {session.movements.length > 1 ? <View style={{ gap: spacing.xs, paddingTop: spacing.xs }}>
      <Text size="sm" tone="dimmed" weight={600}>Then</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {session.movements.filter(movement => movement.id !== main.id).map(movement => <Pressable key={movement.id}
          accessibilityRole="button" accessibilityLabel={`How ${movement.performedMovementName ?? movement.movementName} is worked out`}
          onPress={() => onOpen(movement.id)} style={{ borderRadius: radii.lg, borderWidth: 1, borderColor: theme.border,
            backgroundColor: theme.surface2, paddingHorizontal: 10, minHeight: 44, justifyContent: 'center' }}>
          <Text size="sm" weight={700}>{movement.performedMovementName ?? movement.movementName}</Text>
        </Pressable>)}
      </View>
    </View> : null}
  </>
}
