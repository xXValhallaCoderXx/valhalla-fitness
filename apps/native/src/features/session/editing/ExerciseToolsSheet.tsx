import { Pressable, View } from 'react-native'
import { ArrowDown, ArrowLeftRight, ArrowUp, Calculator, History, Plus, Trash2, type LucideIcon } from 'lucide-react-native'
import { Caption, SheetModal, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'
import type { WorkoutManagementController } from './useWorkoutManagement'

export function ExerciseToolsSheet({ open, onClose, name, tools, canAddSet, onAddSet, addError, canMoveUp, canMoveDown, onMove }: {
  open: boolean; onClose: () => void; name: string; tools: WorkoutManagementController['movementTools']
  canAddSet: boolean; onAddSet: () => void; addError: string | null
  canMoveUp: boolean; canMoveDown: boolean; onMove: (direction: -1 | 1) => void
}) {
  const { theme } = useTokens()
  const run = (action: () => void) => { onClose(); action() }
  return <SheetModal open={open} showHandle onClose={onClose} title={name} subtitle="Tools for this exercise, in this workout">
    <View style={{ paddingHorizontal: spacing.sm, backgroundColor: theme.surface2, borderRadius: radii.lg }}>
      <ToolRow icon={Calculator} title="What goes on the bar" caption="See the plates for this weight." onPress={() => run(tools.onPlates)} />
      <ToolRow icon={History} title="Every session you have logged" caption="Review this exercise in your history." onPress={() => run(tools.onHistory)} />
      {canAddSet ? <ToolRow icon={Plus} title="Add a set" caption="Add another set to this exercise." disabled={tools.disabled} onPress={onAddSet} /> : null}
      {addError ? <Text tone="danger" size="sm">{addError}</Text> : null}
      <ToolRow icon={ArrowLeftRight} title="Swap for something else" caption={tools.swapDisabled ? tools.swapDisabledReason : 'Choose an alternative and its scope.'}
        disabled={tools.disabled || tools.swapDisabled} onPress={() => run(tools.onSwap)} />
      {canMoveUp ? <ToolRow icon={ArrowUp} title="Move up" caption="Reorder this added accessory." disabled={tools.disabled} onPress={() => run(() => onMove(-1))} /> : null}
      {canMoveDown ? <ToolRow icon={ArrowDown} title="Move down" caption="Reorder this added accessory." disabled={tools.disabled} onPress={() => run(() => onMove(1))} /> : null}
      {tools.showRemove ? <ToolRow icon={Trash2} title="Take it out of this workout" caption="Removes this exercise and its logged sets."
        danger disabled={tools.disabled} onPress={() => run(tools.onRemove)} /> : null}
    </View>
  </SheetModal>
}

function ToolRow({ icon: Icon, title, caption, disabled, danger, onPress }: {
  icon: LucideIcon; title: string; caption?: string; disabled?: boolean; danger?: boolean; onPress: () => void
}) {
  const { theme } = useTokens()
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm,
      borderBottomWidth: 1, borderBottomColor: theme.border, opacity: disabled ? 0.6 : pressed ? 0.7 : 1 })}>
    <View style={{ width: 34, height: 34, borderRadius: radii.md, backgroundColor: danger ? theme.tones.danger.soft : theme.background,
      alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={danger ? theme.tones.danger.text : theme.tones.action.text} /></View>
    <View style={{ flex: 1, gap: 4 }}><Text size="sm" weight={800} tone={danger ? 'danger' : undefined}>{title}</Text><Caption>{caption}</Caption></View>
  </Pressable>
}
