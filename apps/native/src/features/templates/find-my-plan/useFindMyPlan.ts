import { useMemo, useState } from 'react'
import type { ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { templateFamilies } from '@sheetless/domain/program/template-families'
import {
  recommendFamilies, type ExperienceLevel,
  type FindMyPlanAnswers, type PlanGoal,
} from '@sheetless/domain/program/recommend-plan'
import type { WizardAnswers } from '@sheetless/domain/program/find-my-plan'
import { NATIVE_FIND_MY_PLAN_QUESTIONS } from './native-find-my-plan'

/** A route-local draft. Pushing a detail screen preserves it; leaving the finder discards it. */
export function useFindMyPlan(templates: ProgramTemplateSummary[]) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<WizardAnswers>({})
  const [phase, setPhase] = useState<'questions' | 'result'>('questions')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const recommendations = useMemo(() => {
    if (phase !== 'result') return []
    const complete: FindMyPlanAnswers | null =
      answers.experience != null && answers.days != null && answers.goal != null
        ? { experience: answers.experience as ExperienceLevel, days: answers.days as number, goal: answers.goal as PlanGoal }
        : null
    return complete ? recommendFamilies(
      templates.filter(template => template.origin !== 'user_created' && template.daysPerWeek <= complete.days), templateFamilies, complete, 3,
    ) : []
  }, [answers, phase, templates])
  const selectedIndex = recommendations.findIndex(item => item.template.id === selectedTemplateId)
  const activeIndex = Math.max(0, selectedIndex)
  const activeRecommendation = recommendations[activeIndex]
  const alternatives = recommendations.map((recommendation, index) => ({ recommendation, index }))
    .filter(({ index }) => index !== activeIndex).slice(0, 2)

  const choose = (value: string | number) => {
    const question = NATIVE_FIND_MY_PLAN_QUESTIONS[step]
    setAnswers(current => ({ ...current, [question.key]: value }))
  }
  const advance = () => {
    if (answers[NATIVE_FIND_MY_PLAN_QUESTIONS[step].key] == null) return
    if (step === NATIVE_FIND_MY_PLAN_QUESTIONS.length - 1) {
      setPhase('result')
      setSelectedTemplateId(null)
    } else setStep(current => current + 1)
  }
  const reset = () => {
    setStep(0)
    setAnswers({})
    setPhase('questions')
    setSelectedTemplateId(null)
    setPreviewOpen(false)
  }
  const back = () => {
    if (phase === 'result') {
      setPhase('questions')
      setStep(NATIVE_FIND_MY_PLAN_QUESTIONS.length - 1)
      setPreviewOpen(false)
    } else setStep(current => Math.max(0, current - 1))
  }

  return {
    step, answers, phase, activeIndex, activeRecommendation, alternatives, previewOpen,
    canGoBack: phase === 'result' || step > 0, choose, advance, reset, back,
    canAdvance: answers[NATIVE_FIND_MY_PLAN_QUESTIONS[step].key] != null,
    editAnswer: (nextStep: number) => { setPhase('questions'); setStep(nextStep); setPreviewOpen(false) },
    selectPlan: (index: number) => {
      setSelectedTemplateId(recommendations[index]?.template.id ?? null)
      setPreviewOpen(false)
    },
    togglePreview: () => setPreviewOpen(current => !current),
  }
}
