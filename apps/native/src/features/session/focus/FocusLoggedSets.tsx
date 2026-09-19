import { Pressable, View } from 'react-native'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import type { Unit } from '@sheetless/domain/shared/types'
import { describeSet } from '@sheetless/domain/shared/set-notation'
import { Caption, SectionLabel, Text } from '@/components'
import { useExperienceMode } from '@/lib/experience-mode'
import { spacing, useTokens } from '@/lib/tokens'

export function FocusLoggedSets({ movement, units, onSelect }: {
  movement: MovementSlot
  units: Unit
  onSelect: (setIndex: number) => void
}) {
  const { isFull } = useExperienceMode()
  const { theme } = useTokens()
  const logged = movement.sets.filter((set) => set.completed || set.syncState === 'syncFailed')
  if (!logged.length) return null
  return (
    <View style={{ gap: spacing.xs }}>
      <SectionLabel>Logged sets · tap to correct</SectionLabel>
      {logged.map((set) => {
        const notation = describeSet(set, units)
        return <Pressable
          key={set.id}
          accessibilityRole="button"
          accessibilityLabel={`Edit set ${set.setIndex}: ${notation.plain}`}
          onPress={() => onSelect(set.setIndex)}
          style={({ pressed }) => ({
            borderBottomColor: theme.border, borderBottomWidth: 1,
            minHeight: 44, paddingVertical: spacing.sm, opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text size="sm">{set.setIndex}. {isFull ? notation.compact : notation.plain}</Text>
          {isFull && notation.technical ? <Caption>{notation.technical}</Caption> : null}
          {set.syncState === 'syncFailed' ? <Caption tone="danger">Not saved · retry this set</Caption>
            : set.syncState === 'saving' ? <Caption>Saving…</Caption> : null}
        </Pressable>
      })}
    </View>
  )
}
