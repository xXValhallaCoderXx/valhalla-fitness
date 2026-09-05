import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronRight, Info, Pencil, RotateCcw } from 'lucide-react-native'
import {
  FIND_MY_PLAN_QUESTIONS,
  TAG_GLOSSARY,
  type FamilyRecommendation,
} from '@sheetless/domain/program/recommend-plan'
import {
  answerLabel,
  levelTone,
  tagLabel,
  type WizardAnswers,
} from '@sheetless/domain/program/find-my-plan'
import type { ProgramSetupOptions } from '@sheetless/domain/program/types'
import { Badge, Button, Caption, EmptyState, Heading, Panel, SectionLabel, Text } from '@/components'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { FindMyPlanPreview } from './FindMyPlanPreview'

export function FindMyPlanResult({
  answers,
  recommendation,
  activeIndex,
  alternatives,
  previewOpen,
  previewLoading,
  previewError,
  previewSessions,
  onEditAnswer,
  onReset,
  onSelectPlan,
  onTogglePreview,
  onRetryPreview,
}: {
  answers: WizardAnswers
  recommendation: FamilyRecommendation | undefined
  activeIndex: number
  alternatives: Array<{ recommendation: FamilyRecommendation; index: number }>
  previewOpen: boolean
  previewLoading: boolean
  previewError: string | null
  previewSessions: ProgramSetupOptions['previewWeeks'][number]['sessions']
  onEditAnswer: (index: number) => void
  onReset: () => void
  onSelectPlan: (index: number) => void
  onTogglePreview: () => void
  onRetryPreview: () => void
}) {
  const { theme } = useTokens()
  const [glossaryOpen, setGlossaryOpen] = useState(false)

  if (!recommendation) {
    return (
      <View style={{ gap: spacing.md }}>
        <AnswerControls answers={answers} onEditAnswer={onEditAnswer} onReset={onReset} />
        <EmptyState title="No plans are available">
          Browse the catalogue or try again after it refreshes.
        </EmptyState>
      </View>
    )
  }

  const glossedTags = recommendation.template.tags.filter((tag) => TAG_GLOSSARY[tag])
  return (
    <View style={{ gap: spacing.lg }}>
      <AnswerControls answers={answers} onEditAnswer={onEditAnswer} onReset={onReset} />

      <View style={{ gap: spacing.sm }}>
        <View style={{ alignItems: 'flex-start' }}>
          <Badge tone={activeIndex === 0 ? 'action' : 'warning'}>
            {activeIndex === 0 ? 'We recommend' : 'Also a good fit'}
          </Badge>
        </View>
        <Heading order={2}>{recommendation.family.name}</Heading>
        <Text size="sm" weight={800}>
          Recommended schedule: {recommendation.template.variantLabel ?? recommendation.template.name}
        </Text>
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <Badge tone={levelTone(recommendation.template.complexity)}>
            {recommendation.template.complexity}
          </Badge>
          <Caption>{recommendation.template.daysPerWeek} days/week</Caption>
          <Caption>· {recommendation.template.progressionLabel}</Caption>
        </View>
        <Text size="sm" tone="dimmed">{recommendation.reason}</Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {recommendation.template.tags.map((tag) => (
            <Badge key={tag}>{tagLabel(tag)}</Badge>
          ))}
        </View>
        {glossedTags.length ? (
          <>
            <Button
              label={glossaryOpen ? 'Hide tag guide' : 'What do these mean?'}
              variant="default"
              leftSection={<Info color={theme.text} size={17} />}
              style={{ minHeight: 44 }}
              onPress={() => setGlossaryOpen((current) => !current)}
            />
            {glossaryOpen ? (
              <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.sm }}>
                {glossedTags.map((tag) => (
                  <View key={tag} style={{ gap: 2 }}>
                    <Text size="sm" weight={800}>{tagLabel(tag)}</Text>
                    <Caption>{TAG_GLOSSARY[tag]}</Caption>
                  </View>
                ))}
              </Panel>
            ) : null}
          </>
        ) : null}
      </View>

      <FindMyPlanPreview
        open={previewOpen}
        loading={previewLoading}
        error={previewError}
        sessions={previewSessions}
        onToggle={onTogglePreview}
        onRetry={onRetryPreview}
      />

      {alternatives.length ? (
        <View style={{ gap: spacing.sm }}>
          <SectionLabel>Other good fits</SectionLabel>
          {alternatives.map(({ recommendation: alternative, index }) => (
            <Pressable
              key={alternative.template.id}
              accessibilityRole="button"
              accessibilityState={{ selected: index === activeIndex }}
              accessibilityLabel={`View ${alternative.family.name}, ${alternative.template.complexity}, ${alternative.template.daysPerWeek} days per week`}
              onPress={() => onSelectPlan(index)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderRadius: radii.md,
                borderWidth: 1,
                flexDirection: 'row',
                gap: spacing.sm,
                minHeight: 64,
                opacity: pressed ? 0.8 : 1,
                padding: spacing.sm,
              })}
            >
              <View
                style={{
                  alignSelf: 'stretch',
                  backgroundColor: theme.tones[levelTone(alternative.template.complexity)].text,
                  borderRadius: 3,
                  width: 4,
                }}
              />
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text size="sm" weight={800} numberOfLines={1}>{alternative.family.name}</Text>
                <Caption numberOfLines={1}>
                  {alternative.template.complexity} · {alternative.template.variantShortLabel ?? `${alternative.template.daysPerWeek} days`} · {alternative.template.progressionLabel}
                </Caption>
              </View>
              <ChevronRight color={theme.textMuted} size={18} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function AnswerControls({
  answers,
  onEditAnswer,
  onReset,
}: {
  answers: WizardAnswers
  onEditAnswer: (index: number) => void
  onReset: () => void
}) {
  const { theme } = useTokens()
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {FIND_MY_PLAN_QUESTIONS.map((question, index) => (
          <Pressable
            key={question.key}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${question.title}: ${answerLabel(question.key, answers[question.key])}`}
            onPress={() => onEditAnswer(index)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: theme.tones.action.soft,
              borderColor: theme.tones.action.border,
              borderRadius: 22,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 5,
              minHeight: 44,
              opacity: pressed ? 0.75 : 1,
              paddingHorizontal: spacing.sm,
            })}
          >
            <Caption tone="action">{answerLabel(question.key, answers[question.key])}</Caption>
            <Pencil color={theme.tones.action.text} size={13} />
          </Pressable>
        ))}
      </View>
      <Button
        label="Start over"
        variant="subtle"
        leftSection={<RotateCcw color={theme.tones.action.text} size={17} />}
        style={{ minHeight: 44 }}
        onPress={onReset}
      />
    </View>
  )
}
