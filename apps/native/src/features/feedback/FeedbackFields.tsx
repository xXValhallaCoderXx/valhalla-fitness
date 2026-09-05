import { View } from 'react-native'
import { FEEDBACK_MESSAGE_MAX, type FeedbackCategory, type FeedbackOption } from '@sheetless/domain/feedback/feedback-options'
import { Caption, SegmentedControl, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'

export function FeedbackFields({ options, category, onCategory, message, onMessage, pending, requiredMessage = false }: {
  options: FeedbackOption[]; category: FeedbackCategory | null; onCategory: (category: FeedbackCategory) => void
  message: string; onMessage: (message: string) => void; pending: boolean; requiredMessage?: boolean
}) {
  return <View style={{ gap: spacing.sm }}>
    <SegmentedControl options={options} value={category} onChange={onCategory} disabled={pending}
      label="Category" accessibilityLabel="Feedback category" />
    <Caption>{requiredMessage ? 'Message' : 'Message (optional)'}</Caption>
    <TextInput accessibilityLabel="Feedback message"
      value={message} onChangeText={onMessage} multiline maxLength={FEEDBACK_MESSAGE_MAX}
      editable={!pending} placeholder="What did you expect?" inputStyle={{ minHeight: 100, textAlignVertical: 'top' }} />
    <Caption>{message.length}/{FEEDBACK_MESSAGE_MAX}</Caption>
  </View>
}
