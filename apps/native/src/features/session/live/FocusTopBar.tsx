import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronLeft, MoreHorizontal } from 'lucide-react-native'
import type { PlannedSession } from '@sheetless/domain/session/types/session'
import { Button, Caption, SheetModal, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

/** Keep essential navigation visible; occasional destructive actions live in the menu. */
export function FocusTopBar({
  onBack,
  backDisabled,
  backLabel = 'Today',
  centerPrimary,
  centerSecondary,
  equipmentMode,
  finishLabel,
  finishDisabled,
  onFinish,
  renameDisabled = false,
  onRename,
  discardDisabled,
  onDiscard,
}: {
  onBack: () => void
  backDisabled: boolean
  backLabel?: string
  centerPrimary: string
  centerSecondary: string
  equipmentMode?: PlannedSession['equipmentMode']
  finishLabel: string
  finishDisabled: boolean
  onFinish: () => void
  renameDisabled?: boolean
  onRename?: () => void
  discardDisabled: boolean
  onDiscard: () => void
}) {
  const { theme } = useTokens()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <View style={{ borderBottomColor: theme.border, borderBottomWidth: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs }}>
          <Pressable
            onPress={onBack}
            disabled={backDisabled}
            accessibilityLabel={`Back to ${backLabel}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: backDisabled }}
            testID="focus-back"
            style={({ pressed }) => ({
              alignItems: 'center', flexDirection: 'row', minHeight: 44,
              opacity: backDisabled ? 0.4 : pressed ? 0.6 : 1,
            })}
          >
            <ChevronLeft size={20} color={theme.textMuted} />
            <Text size="sm" tone="dimmed" weight={700}>{backLabel}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Button label={finishLabel} variant="subtle" disabled={finishDisabled} onPress={onFinish} testID="focus-finish" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Workout actions"
            onPress={() => setMenuOpen(true)}
            style={({ pressed }) => ({ alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, opacity: pressed ? 0.6 : 1 })}
          >
            <MoreHorizontal size={22} color={theme.textMuted} />
          </Pressable>
        </View>
        <Text size="sm" weight={800}>{centerPrimary}</Text>
        <Caption>{centerSecondary}{equipmentMode === 'free_weight' ? ' · Free weights' : ''}</Caption>
      </View>
      <SheetModal open={menuOpen} title="Workout actions" onClose={() => setMenuOpen(false)}>
        <View style={{ gap: spacing.sm }}>
          {onRename ? <Button
            label="Rename workout" variant="default" disabled={renameDisabled} testID="rename-workout"
            onPress={() => { setMenuOpen(false); onRename() }}
          /> : null}
          <Button
            label="Discard workout" variant="light" tone="danger" disabled={discardDisabled} testID="focus-discard"
            onPress={() => { setMenuOpen(false); onDiscard() }}
          />
        </View>
      </SheetModal>
    </>
  )
}
