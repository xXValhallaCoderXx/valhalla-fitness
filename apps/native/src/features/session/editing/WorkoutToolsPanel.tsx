import { View } from 'react-native'
import { NotebookPen, Plus } from 'lucide-react-native'
import { Badge, Button, Caption, Panel, SectionLabel } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export interface WorkoutToolsPanelProps {
  isAdHoc: boolean
  hasNotes: boolean
  disabled?: boolean
  addDisabled?: boolean
  onAddMovement: () => void
  onNotes: () => void
}

/** Workout-wide actions shown after Coming Up in the focused logger. */
export function WorkoutToolsPanel({
  isAdHoc,
  hasNotes,
  disabled = false,
  addDisabled = false,
  onAddMovement,
  onNotes,
}: WorkoutToolsPanelProps) {
  const { theme } = useTokens()
  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ gap: 3 }}>
          <SectionLabel>Workout tools</SectionLabel>
          <Caption>{isAdHoc ? 'Shape this one-off workout as you train.' : 'Add work or keep a session note.'}</Caption>
        </View>
        {hasNotes ? <Badge tone="success">Notes added</Badge> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label={isAdHoc ? 'Add exercise' : 'Add accessory'}
          variant="default"
          leftSection={<Plus color={theme.tones.action.text} size={17} />}
          disabled={disabled || addDisabled}
          style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
          onPress={onAddMovement}
        />
        <Button
          label={hasNotes ? 'Edit notes' : 'Session notes'}
          variant="default"
          leftSection={<NotebookPen color={theme.tones.action.text} size={17} />}
          disabled={disabled}
          style={{ flex: 1, minHeight: 44, paddingHorizontal: spacing.xs }}
          onPress={onNotes}
        />
      </View>
    </Panel>
  )
}
