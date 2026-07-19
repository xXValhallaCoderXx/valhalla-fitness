import { Modal } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { programSetupOptionsQueryOptions } from '~/domains/program/queries'
import type { ProgramTemplateSummary } from '~/shared/types'
import { type WizardAnswers } from '~/domains/program/lib/find-my-plan'
import {
  FIND_MY_PLAN_QUESTIONS,
  recommendFamilies,
  type ExperienceLevel,
  type FindMyPlanAnswers,
  type PlanGoal,
} from '~/domains/program/lib/recommend-plan'
import { templateFamilies } from '~/domains/program/lib/template-families'
import { FindMyPlanQuestions } from './find-my-plan/FindMyPlanQuestions'
import { FindMyPlanResult } from './find-my-plan/FindMyPlanResult'

/**
 * Step-by-step plan picker: one question at a time → a ranked result with a real "typical week"
 * peek. `onStart` is the only side effect — the caller decides where it goes (login when used on
 * marketing, the plan start/overview page inside the app).
 */
export function FindMyPlanModal({
  opened,
  onClose,
  templates,
  onStart,
  showBrowseAll = false,
}: {
  opened: boolean
  onClose: () => void
  templates: ProgramTemplateSummary[]
  onStart: (templateId: string) => void
  /** "Browse all" closes the modal onto the full catalogue — only meaningful inside the app. */
  showBrowseAll?: boolean
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<WizardAnswers>({})
  const [phase, setPhase] = useState<'questions' | 'result'>('questions')
  const [selected, setSelected] = useState(0)
  const [weekOpen, setWeekOpen] = useState(false)

  // Fresh wizard each time it opens (the component stays mounted between opens).
  useEffect(() => {
    if (!opened) return
    /* eslint-disable react-hooks/set-state-in-effect -- one-time reset when the modal opens */
    setStep(0)
    setAnswers({})
    setPhase('questions')
    setSelected(0)
    setWeekOpen(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [opened])

  const totalSteps = FIND_MY_PLAN_QUESTIONS.length
  const question = FIND_MY_PLAN_QUESTIONS[step]

  const recs = useMemo(() => {
    if (phase !== 'result') return []
    const complete: FindMyPlanAnswers | null =
      answers.experience != null && answers.days != null && answers.goal != null
        ? {
            experience: answers.experience as ExperienceLevel,
            days: answers.days as number,
            goal: answers.goal as PlanGoal,
          }
        : null
    return complete ? recommendFamilies(templates, templateFamilies, complete, 3) : []
  }, [phase, answers, templates])
  const activeIndex = Math.min(selected, Math.max(0, recs.length - 1))
  const activeRec = recs[activeIndex]
  const goodFits = recs.map((rec, index) => ({ rec, index })).filter((entry) => entry.index !== activeIndex).slice(0, 2)

  const weekQuery = useQuery({
    ...programSetupOptionsQueryOptions(activeRec?.template.id ?? ''),
    enabled: phase === 'result' && Boolean(activeRec),
  })
  const weekSessions = weekQuery.data?.previewWeeks?.[0]?.sessions ?? []
  const weekLoading = weekQuery.isFetching && !weekQuery.data

  const choose = (value: string | number) => {
    const key = question.key
    setAnswers((current) => ({ ...current, [key]: value }))
    if (step >= totalSteps - 1) {
      setPhase('result')
      setSelected(0)
    } else {
      setStep((current) => current + 1)
    }
  }
  const back = () => {
    setStep((current) => Math.max(0, current - 1))
  }
  const editAnswer = (index: number) => {
    setPhase('questions')
    setStep(index)
  }
  const reset = () => {
    setStep(0)
    setAnswers({})
    setPhase('questions')
    setSelected(0)
    setWeekOpen(false)
  }
  const selectPlan = (index: number) => {
    setSelected(index)
    setWeekOpen(false)
  }
  const start = () => {
    if (activeRec) onStart(activeRec.template.id)
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      centered
      padding={0}
      size="56rem"
      radius="lg"
      classNames={{
        inner: 'p-0 sm:p-4',
        content:
          'h-[100dvh] max-h-[100dvh] w-full rounded-none sm:h-auto sm:max-h-[92dvh] sm:w-auto sm:rounded-[var(--mantine-radius-lg)]',
        body: 'h-full',
      }}
    >
      {phase === 'questions' ? (
        <FindMyPlanQuestions
          step={step}
          answers={answers}
          onChoose={choose}
          onBack={back}
          onClose={onClose}
        />
      ) : (
        <FindMyPlanResult
          answers={answers}
          activeRec={activeRec}
          activeIndex={activeIndex}
          goodFits={goodFits}
          weekOpen={weekOpen}
          weekLoading={weekLoading}
          weekSessions={weekSessions}
          showBrowseAll={showBrowseAll}
          onEditAnswer={editAnswer}
          onReset={reset}
          onToggleWeek={() => setWeekOpen((current) => !current)}
          onSelectPlan={selectPlan}
          onStart={start}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}
