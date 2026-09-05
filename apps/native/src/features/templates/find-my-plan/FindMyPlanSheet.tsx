import { useEffect, useMemo, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { templateFamilies } from '@sheetless/domain/program/template-families'
import {
  FIND_MY_PLAN_QUESTIONS,
  recommendFamilies,
  type ExperienceLevel,
  type FindMyPlanAnswers,
  type PlanGoal,
} from '@sheetless/domain/program/recommend-plan'
import type { WizardAnswers } from '@sheetless/domain/program/find-my-plan'
import { Button, SheetModal } from '@/components'
import { templateSetupQueryOptions } from '../queries'
import { FindMyPlanQuestions } from './FindMyPlanQuestions'
import { FindMyPlanResult } from './FindMyPlanResult'

type FinderPhase = 'questions' | 'result'

export function FindMyPlanSheet({
  open,
  user,
  templates,
  onClose,
  onViewTemplate,
}: {
  open: boolean
  user: User
  templates: ProgramTemplateSummary[]
  onClose: () => void
  onViewTemplate: (templateId: string) => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<WizardAnswers>({})
  const [phase, setPhase] = useState<FinderPhase>('questions')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (open) return
    /* eslint-disable react-hooks/set-state-in-effect -- reset while hidden so every open starts fresh */
    setStep(0)
    setAnswers({})
    setPhase('questions')
    setSelectedIndex(0)
    setPreviewOpen(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open])

  const recommendations = useMemo(() => {
    if (phase !== 'result') return []
    const completeAnswers: FindMyPlanAnswers | null =
      answers.experience != null && answers.days != null && answers.goal != null
        ? {
            experience: answers.experience as ExperienceLevel,
            days: answers.days as number,
            goal: answers.goal as PlanGoal,
          }
        : null
    if (!completeAnswers) return []
    const builtIns = templates.filter((template) => template.origin !== 'user_created')
    return recommendFamilies(builtIns, templateFamilies, completeAnswers, 3)
  }, [answers, phase, templates])

  const activeIndex = Math.min(selectedIndex, Math.max(0, recommendations.length - 1))
  const activeRecommendation = recommendations[activeIndex]
  const alternatives = recommendations
    .map((recommendation, index) => ({ recommendation, index }))
    .filter(({ index }) => index !== activeIndex)
    .slice(0, 2)
  const preview = useQuery({
    ...templateSetupQueryOptions(user, activeRecommendation?.template.id ?? ''),
    enabled: open && phase === 'result' && Boolean(activeRecommendation),
  })
  const previewSessions = preview.data?.previewWeeks[0]?.sessions ?? []

  useEffect(() => {
    if (!open) return
    if (phase === 'questions') {
      const question = FIND_MY_PLAN_QUESTIONS[step]
      AccessibilityInfo.announceForAccessibility(
        `Question ${step + 1} of ${FIND_MY_PLAN_QUESTIONS.length}. ${question.title}`,
      )
      return
    }
    AccessibilityInfo.announceForAccessibility(
      activeRecommendation
        ? `${activeIndex === 0 ? 'Recommended plan' : 'Good fit'}. ${activeRecommendation.family.name}. ${activeRecommendation.template.daysPerWeek} days per week.`
        : 'No plans are available right now.',
    )
  }, [activeIndex, activeRecommendation, open, phase, step])

  const choose = (value: string | number) => {
    const question = FIND_MY_PLAN_QUESTIONS[step]
    setAnswers((current) => ({ ...current, [question.key]: value }))
    if (step === FIND_MY_PLAN_QUESTIONS.length - 1) {
      setPhase('result')
      setSelectedIndex(0)
    } else {
      setStep((current) => current + 1)
    }
  }
  const reset = () => {
    setStep(0)
    setAnswers({})
    setPhase('questions')
    setSelectedIndex(0)
    setPreviewOpen(false)
  }
  const editAnswer = (nextStep: number) => {
    setPhase('questions')
    setStep(nextStep)
    setPreviewOpen(false)
  }
  const selectPlan = (index: number) => {
    setSelectedIndex(index)
    setPreviewOpen(false)
  }
  const viewTemplate = () => {
    if (!activeRecommendation) return
    onClose()
    onViewTemplate(activeRecommendation.template.id)
  }

  return (
    <SheetModal
      open={open}
      title="Find my plan"
      subtitle={phase === 'questions' ? 'Three quick questions' : 'Your best matches'}
      onClose={onClose}
      footer={phase === 'result' && activeRecommendation ? (
        <Button
          label="View plan"
          fullWidth
          onPress={viewTemplate}
          testID="find-my-plan-view"
        />
      ) : undefined}
      testID="find-my-plan-sheet"
    >
      {phase === 'questions' ? (
        <FindMyPlanQuestions
          step={step}
          answers={answers}
          onChoose={choose}
          onBack={() => setStep((current) => Math.max(0, current - 1))}
        />
      ) : (
        <FindMyPlanResult
          key={activeRecommendation?.template.id ?? 'no-recommendation'}
          answers={answers}
          recommendation={activeRecommendation}
          activeIndex={activeIndex}
          alternatives={alternatives}
          previewOpen={previewOpen}
          previewLoading={preview.isFetching && !preview.data}
          previewError={
            preview.isError
              ? preview.error instanceof Error
                ? preview.error.message
                : 'Plan preview is unavailable right now.'
              : null
          }
          previewSessions={previewSessions}
          onEditAnswer={editAnswer}
          onReset={reset}
          onSelectPlan={selectPlan}
          onTogglePreview={() => setPreviewOpen((current) => !current)}
          onRetryPreview={() => void preview.refetch()}
        />
      )}
    </SheetModal>
  )
}
