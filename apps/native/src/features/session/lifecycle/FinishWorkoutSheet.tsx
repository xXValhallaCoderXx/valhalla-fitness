import { useState } from 'react'
import { Pressable, View } from 'react-native'
import {
  REFLECTION_MAX_LENGTH, SESSION_RPE_MAX, SESSION_RPE_MIN, reflectionImprovePrompt,
  reflectionWinPrompt, sessionRpeEndLabels, sessionRpeQuestion,
} from '@sheetless/domain/session/session-reflection'
import { Button, Caption, SectionLabel, SheetModal, Text, TextInput } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export type FinishReflection = {
  sessionRpe: number | null
  reflectionWin: string | null
  reflectionImprove: string | null
}

const EFFORT_OPTIONS = Array.from(
  { length: SESSION_RPE_MAX - SESSION_RPE_MIN + 1 },
  (_, index) => SESSION_RPE_MIN + index,
)

export function FinishWorkoutSheet({ open, completedSetCount, incompleteSetCount, editedSetCount = 0, elapsed,
  isPending, blocked = false, error, onCancel, onFinish }: {
  open: boolean; completedSetCount: number; incompleteSetCount: number; editedSetCount?: number; elapsed?: string
  isPending: boolean; blocked?: boolean; error?: string | null; onCancel: () => void; onFinish: (reflection: FinishReflection) => void
}) {
  const { theme } = useTokens()
  const [effort, setEffort] = useState<number | null>(null)
  const [win, setWin] = useState('')
  const [improve, setImprove] = useState('')
  const [reflectionOpen, setReflectionOpen] = useState(false)
  return <SheetModal open={open} showHandle title="Finish workout?" subtitle={`${completedSetCount} set${completedSetCount === 1 ? '' : 's'} logged${elapsed ? ` · ${elapsed}` : ''}`}
    onClose={onCancel} closeDisabled={isPending} testID="finish-session-sheet" footer={
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Button label="Keep logging" variant="default" style={{ flex: 1, minWidth: 120 }} disabled={isPending} onPress={onCancel} />
        <Button label="Finish workout" style={{ flex: 1, minWidth: 120 }} loading={isPending} disabled={blocked || completedSetCount === 0}
          onPress={() => { if (!blocked && completedSetCount > 0) onFinish({ sessionRpe: effort, reflectionWin: win.trim() || null, reflectionImprove: improve.trim() || null }) }} testID="finish-confirm" />
      </View>
    }>
    {incompleteSetCount > 0 || editedSetCount > 0 ? <View style={{ padding: spacing.sm, gap: spacing.xs, borderRadius: radii.md, backgroundColor: theme.tones.warning.soft }}>
      {incompleteSetCount > 0 ? <Text size="sm">{incompleteSetCount} set{incompleteSetCount === 1 ? '' : 's'} unlogged. Only completed sets will be saved in your recap. Missing work can affect progression recommendations.</Text> : null}
      {editedSetCount > 0 ? <Text size="sm" tone="warning">Edits to {editedSetCount} set{editedSetCount === 1 ? '' : 's'} have not been logged. Finishing omits those edits; it does not log them automatically.</Text> : null}
    </View> : null}
    {blocked && !isPending ? <Text size="sm" tone="danger">Save or retry all sets before finishing.</Text> : null}
    <View>
      <SectionLabel>{sessionRpeQuestion}</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {EFFORT_OPTIONS.map((option) => {
          const selected = effort === option
          return (
            <Pressable
              key={option}
              accessibilityLabel={`Effort ${option} of ${SESSION_RPE_MAX}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: isPending, selected }}
              disabled={isPending}
              onPress={() => setEffort(selected ? null : option)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: selected ? theme.primaryFill : theme.surface,
                borderColor: selected ? theme.primaryFill : theme.border,
                borderRadius: radii.sm,
                borderWidth: 1,
                minWidth: 44,
                flexBasis: '17.5%',
                flexGrow: 1,
                minHeight: 44,
                opacity: pressed ? 0.8 : 1,
                paddingVertical: spacing.xs + 2,
              })}
            >
              <Text size="sm" style={{ color: selected ? theme.primaryFillText : theme.text, fontWeight: '700' }}>
                {option}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Caption>{sessionRpeEndLabels.low}</Caption>
        <Caption>{sessionRpeEndLabels.high}</Caption>
      </View>
    </View>

    <Button label={reflectionOpen ? 'Hide reflection' : 'Add a reflection'} variant="subtle" onPress={() => setReflectionOpen(!reflectionOpen)} />
    {reflectionOpen ? <View style={{ gap: spacing.md }}>
      <View style={{ gap: 4 }}>
        <SectionLabel>{reflectionWinPrompt}</SectionLabel>
        <TextInput accessibilityLabel={reflectionWinPrompt} editable={!isPending} value={win} onChangeText={setWin} maxLength={REFLECTION_MAX_LENGTH} placeholder="Optional" />
      </View>
      <View style={{ gap: 4 }}>
        <SectionLabel>{reflectionImprovePrompt}</SectionLabel>
        <TextInput
          accessibilityLabel={reflectionImprovePrompt}
          editable={!isPending}
          value={improve}
          onChangeText={setImprove}
          maxLength={REFLECTION_MAX_LENGTH}
          placeholder="Optional"
        />
      </View>

    </View> : null}
    {error ? <Text size="sm" tone="danger">{error}</Text> : null}
  </SheetModal>
}
