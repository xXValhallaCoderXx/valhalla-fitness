import { Pressable, View } from 'react-native'
import { Check, ChevronLeft } from 'lucide-react-native'
import { FIND_MY_PLAN_QUESTIONS } from '@sheetless/domain/program/recommend-plan'
import {
  RECAP_KEYS,
  answerLabel,
  type WizardAnswers,
} from '@sheetless/domain/program/find-my-plan'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'

export function FindMyPlanQuestions({
  step,
  answers,
  onChoose,
  onBack,
}: {
  step: number
  answers: WizardAnswers
  onChoose: (value: string | number) => void
  onBack: () => void
}) {
  const { theme } = useTokens()
  const question = FIND_MY_PLAN_QUESTIONS[step]
  const progress = Math.round(((step + 1) / FIND_MY_PLAN_QUESTIONS.length) * 100)
  const answeredKeys = RECAP_KEYS.filter((key) => answers[key] != null)

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
          <SectionLabel>Question {step + 1} of {FIND_MY_PLAN_QUESTIONS.length}</SectionLabel>
          <Caption tone="action">{progress}%</Caption>
        </View>
        <View
          accessibilityLabel={`${progress}% complete`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progress }}
          style={{ backgroundColor: theme.surfaceInset, borderRadius: 4, height: 6, overflow: 'hidden' }}
        >
          <View style={{ backgroundColor: theme.primaryFill, height: '100%', width: `${progress}%` }} />
        </View>
      </View>

      <View style={{ gap: spacing.xs }}>
        <Heading order={2}>{question.title}</Heading>
        <Caption>{question.helper}</Caption>
      </View>

      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        {question.options.map((option) => {
          const selected = answers[question.key] === option.value
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChoose(option.value)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: selected ? theme.tones.action.soft : theme.surface,
                borderColor: selected ? theme.focusOutline : theme.border,
                borderRadius: radii.md,
                borderWidth: 1,
                flexDirection: 'row',
                gap: spacing.sm,
                minHeight: 64,
                opacity: pressed ? 0.8 : 1,
                padding: spacing.md,
              })}
              testID={`find-plan-${question.key}-${String(option.value).toLowerCase()}`}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: selected ? theme.primaryFill : 'transparent',
                  borderColor: selected ? theme.primaryFill : theme.border,
                  borderRadius: 11,
                  borderWidth: 1,
                  height: 22,
                  justifyContent: 'center',
                  width: 22,
                }}
              >
                {selected ? <Check color={theme.primaryFillText} size={14} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text size="sm" weight={800}>{option.label}</Text>
                <Caption>{option.sub}</Caption>
              </View>
            </Pressable>
          )
        })}
      </View>

      {answeredKeys.length ? (
        <Panel surface="inset" style={{ gap: spacing.xs, padding: spacing.sm }}>
          <SectionLabel>So far</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {answeredKeys.map((key) => (
              <Caption key={key} tone="action">{answerLabel(key, answers[key])}</Caption>
            ))}
          </View>
        </Panel>
      ) : null}

      {step > 0 ? (
        <Button
          label="Back"
          variant="subtle"
          leftSection={<ChevronLeft color={theme.tones.action.text} size={18} />}
          style={{ minHeight: 44 }}
          onPress={onBack}
        />
      ) : null}
    </View>
  )
}
