/**
 * Native port of web FinishSessionModal — the one moment we ask how the
 * workout felt. Everything is optional: the primary button always finishes
 * immediately, rating or no rating. RN Modal styled as a bottom sheet.
 */
import { useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  REFLECTION_MAX_LENGTH,
  SESSION_RPE_MAX,
  SESSION_RPE_MIN,
  reflectionImprovePrompt,
  reflectionWinPrompt,
  sessionRpeEndLabels,
  sessionRpeQuestion,
} from '@sheetless/domain/session/session-reflection'
import { Button, Caption, Heading, SectionLabel, Text, TextInput } from '@/components'
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

export function FinishWorkoutSheet({
  open,
  incompleteSetCount,
  isPending,
  error,
  onCancel,
  onFinish,
}: {
  open: boolean
  incompleteSetCount: number
  isPending: boolean
  error?: string | null
  onCancel: () => void
  onFinish: (reflection: FinishReflection) => void
}) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const [effort, setEffort] = useState<number | null>(null)
  const [win, setWin] = useState('')
  const [improve, setImprove] = useState('')

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => !isPending && onCancel()}>
      <Pressable
        onPress={isPending ? undefined : onCancel}
        style={{ backgroundColor: 'rgba(6, 12, 14, 0.55)', flex: 1, justifyContent: 'flex-end' }}
      >
        {/* Inner pressable swallows taps so only the backdrop dismisses. */}
        <Pressable onPress={() => {}} style={{ cursor: 'auto' }}>
          <View
            testID="finish-session-sheet"
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              gap: spacing.md,
              padding: spacing.lg,
              paddingBottom: spacing.lg + insets.bottom,
            }}
          >
            <Heading order={2}>Nice work — how did it go?</Heading>

            {incompleteSetCount > 0 ? (
              <View
                style={{
                  backgroundColor: theme.tones.warning.soft,
                  borderColor: theme.tones.warning.border,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  padding: spacing.sm,
                }}
              >
                <Text size="sm" style={{ color: theme.tones.warning.text }}>
                  You have {incompleteSetCount} set{incompleteSetCount === 1 ? '' : 's'} left to log. Finishing
                  now is fine — Sheetless only uses the sets you've logged and won't make aggressive changes.
                </Text>
              </View>
            ) : null}

            <View>
              <SectionLabel>{sessionRpeQuestion}</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {EFFORT_OPTIONS.map((option) => {
                  const selected = effort === option
                  return (
                    <Pressable
                      key={option}
                      accessibilityLabel={`Effort ${option} of ${SESSION_RPE_MAX}`}
                      disabled={isPending}
                      onPress={() => setEffort(selected ? null : option)}
                      style={({ pressed }) => ({
                        alignItems: 'center',
                        backgroundColor: selected ? theme.primaryFill : theme.surface,
                        borderColor: selected ? theme.primaryFill : theme.border,
                        borderRadius: radii.sm,
                        borderWidth: 1,
                        flexBasis: '17.5%',
                        flexGrow: 1,
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

            <View style={{ gap: 4 }}>
              <SectionLabel>{reflectionWinPrompt}</SectionLabel>
              <TextInput value={win} onChangeText={setWin} maxLength={REFLECTION_MAX_LENGTH} placeholder="Optional" />
            </View>
            <View style={{ gap: 4 }}>
              <SectionLabel>{reflectionImprovePrompt}</SectionLabel>
              <TextInput
                value={improve}
                onChangeText={setImprove}
                maxLength={REFLECTION_MAX_LENGTH}
                placeholder="Optional"
              />
            </View>

            {error ? (
              <Text size="sm" tone="danger">
                {error}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button label="Keep going" variant="default" fullWidth disabled={isPending} onPress={onCancel} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Finish workout"
                  fullWidth
                  loading={isPending}
                  onPress={() =>
                    onFinish({
                      sessionRpe: effort,
                      reflectionWin: win.trim() || null,
                      reflectionImprove: improve.trim() || null,
                    })
                  }
                  testID="finish-confirm"
                />
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
