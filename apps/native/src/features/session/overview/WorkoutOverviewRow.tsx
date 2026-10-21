import { Pressable, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { todayMovementPreview } from '@sheetless/domain/session/today-prescription'
import { Caption, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function WorkoutOverviewRow({ movement, session, advanced, ordinal, active, last, onOpen }: {
  movement: MovementSlot; session: WorkoutSession; advanced: boolean; ordinal: number; active: boolean; last: boolean; onOpen: () => void
}) {
  const { theme } = useTokens()
  const completed = movement.sets.filter(set => set.completed && set.syncState !== 'saving' && set.syncState !== 'syncFailed').length
  const name = movement.performedMovementName ?? movement.movementName
  const preview = todayMovementPreview(movement, session, advanced ? 'full' : 'guided')
  return <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${completed} of ${movement.sets.length} sets logged. Select exercise.`}
    accessibilityState={{ selected: active }} onPress={onOpen} testID={`overview-movement-${movement.id}`}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingVertical: spacing.sm, minHeight: 54, borderBottomWidth: last ? 0 : 1,
      borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 })}>
    {active ? <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.primaryFill }} />
      : <Text size="xs" weight={800} tone="dimmed" style={{ width: 20, textAlign: 'center' }}>{completed === movement.sets.length ? '✓' : ordinal}</Text>}
    <View style={{ flex: 1, gap: 4 }}>
      <Text size="sm" weight={800} tone={active ? 'action' : undefined}>{name}</Text>
      <Caption>{preview.prescription.split(' · last time')[0]}</Caption>
    </View>
    <Caption tone={active ? 'action' : 'dimmed'} style={{ maxWidth: '28%' }}>
      {active ? 'doing now' : completed ? `${completed}/${movement.sets.length} logged` : `${movement.sets.length} sets`}
    </Caption>
    {!active ? <ChevronRight size={14} color={theme.textMuted} /> : null}
  </Pressable>
}
