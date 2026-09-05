import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Button, Caption, Panel, SectionLabel, SheetModal, Text, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'

export const SESSION_NOTES_MAX_LENGTH = 2_000

export interface SessionNotesSheetProps {
  open: boolean
  notes: string
  disabled?: boolean
  onClose: () => void
  onSave: (notes: string) => void
}

/** Edits the in-memory workout note; persistence remains atomic with Finish. */
export function SessionNotesSheet({
  open,
  notes,
  disabled = false,
  onClose,
  onSave,
}: SessionNotesSheetProps) {
  const [draft, setDraft] = useState(notes)

  useEffect(() => {
    if (open) setDraft(notes)
  }, [notes, open])

  return (
    <SheetModal
      open={open}
      title="Session notes"
      subtitle="Keep context about the whole workout, not an individual set."
      closeDisabled={disabled}
      onClose={onClose}
      testID="session-notes-sheet"
      footer={(
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label="Cancel"
            variant="default"
            fullWidth
            disabled={disabled}
            style={{ flex: 1, minHeight: 44 }}
            onPress={onClose}
          />
          <Button
            label="Keep notes"
            fullWidth
            disabled={disabled}
            style={{ flex: 1, minHeight: 44 }}
            onPress={() => onSave(draft)}
            testID="save-session-notes"
          />
        </View>
      )}
    >
      <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
          <SectionLabel>Workout note</SectionLabel>
          <Caption>{draft.length}/{SESSION_NOTES_MAX_LENGTH}</Caption>
        </View>
        <TextInput
          accessibilityLabel="Workout note"
          value={draft}
          onChangeText={setDraft}
          placeholder="Anything worth remembering from this session?"
          autoCapitalize="sentences"
          maxLength={SESSION_NOTES_MAX_LENGTH}
          multiline
          numberOfLines={7}
          textAlignVertical="top"
          blurOnSubmit={false}
          editable={!disabled}
          inputStyle={{ minHeight: 150 }}
          testID="session-notes-input"
        />
      </Panel>
      <Text size="sm" tone="dimmed">
        Notes are kept with this workout when you finish it. Leaving the workout before finishing will not save new edits.
      </Text>
    </SheetModal>
  )
}
