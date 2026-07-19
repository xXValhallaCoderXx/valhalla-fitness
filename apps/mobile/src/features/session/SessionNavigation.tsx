import { useAppTheme } from '@/theme/useAppTheme'
import type { MovementSlot, WorkoutSession } from '@sheetless/core'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

export function MovementTabs({
  session,
  activeMovementId,
  onSelect,
}: {
  session: WorkoutSession
  activeMovementId: string | null
  onSelect: (movementId: string) => void
}) {
  const { colors } = useAppTheme()
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.movementRow}>
      {[...session.movements].sort((a, b) => a.orderIndex - b.orderIndex).map((movement) => {
        const selected = movement.id === activeMovementId
        const complete = movement.sets.length > 0 && movement.sets.every((set) => set.completed)
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={movement.id}
            onPress={() => onSelect(movement.id)}
            style={[
              styles.movementChip,
              {
                backgroundColor: selected ? colors.actionSoft : colors.surface2,
                borderColor: selected ? colors.actionBorder : colors.border,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.movementChipText, { color: selected ? colors.actionText : colors.text }]}
            >
              {complete ? '✓ ' : ''}{movement.performedMovementName ?? movement.movementName}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export function SetTabs({
  movement,
  activeSetIndex,
  onSelect,
}: {
  movement: MovementSlot
  activeSetIndex: number
  onSelect: (setIndex: number) => void
}) {
  const { colors } = useAppTheme()
  return (
    <View style={styles.setRow}>
      {movement.sets.map((set) => {
        const selected = set.setIndex === activeSetIndex
        return (
          <Pressable
            accessibilityLabel={`Set ${set.setIndex}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={set.id}
            onPress={() => onSelect(set.setIndex)}
            style={[
              styles.setChip,
              {
                backgroundColor: selected
                  ? colors.actionText
                  : set.completed
                    ? colors.successSoft
                    : colors.surface2,
                borderColor: selected ? colors.actionText : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.setChipText,
                { color: selected ? colors.surface : set.completed ? colors.successText : colors.text },
              ]}
            >
              {set.completed ? '✓' : set.setIndex}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  movementRow: { gap: 8, paddingRight: 18 },
  movementChip: { borderRadius: 999, borderWidth: 1, maxWidth: 190, paddingHorizontal: 13, paddingVertical: 10 },
  movementChipText: { fontSize: 13, fontWeight: '800' },
  setRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  setChip: { alignItems: 'center', borderRadius: 999, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  setChipText: { fontSize: 14, fontWeight: '900' },
})
