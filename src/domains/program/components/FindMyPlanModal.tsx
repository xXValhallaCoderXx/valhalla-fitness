import { Badge, Button, Modal } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Pencil,
  RefreshCw,
  RotateCcw,
  Scale,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { programSetupOptionsQueryOptions } from '~/domains/program/queries'
import { cn } from '~/shared/lib/cn'
import type { ProgramTemplateSummary } from '~/shared/types'
import {
  FIND_MY_PLAN_QUESTIONS,
  recommendFamilies,
  TAG_GLOSSARY,
  type ExperienceLevel,
  type FindMyPlanAnswers,
  type PlanGoal,
} from '~/domains/program/lib/recommend-plan'
import { templateFamilies } from '~/domains/program/lib/template-families'

type WizardAnswers = Partial<Record<'experience' | 'days' | 'goal', string | number>>

const RECAP_KEYS = ['experience', 'days', 'goal'] as const

const TAG_LABELS: Record<string, string> = {
  '5x5': '5×5',
  'upper-lower': 'Upper/Lower',
  'training max': 'Training max',
  'high volume': 'High volume',
}

function tagLabel(tag: string) {
  return TAG_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1)
}

function levelTone(complexity: string): 'success' | 'action' | 'warning' {
  if (complexity === 'Beginner') return 'success'
  if (complexity === 'Advanced') return 'warning'
  return 'action'
}

function answerLabel(key: string, value: string | number | undefined) {
  const question = FIND_MY_PLAN_QUESTIONS.find((item) => item.key === key)
  return question?.options.find((option) => option.value === value)?.label ?? '—'
}

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
  const [openGloss, setOpenGloss] = useState<string | null>(null)
  const [weekOpen, setWeekOpen] = useState(false)

  // Fresh wizard each time it opens (the component stays mounted between opens).
  useEffect(() => {
    if (!opened) return
    /* eslint-disable react-hooks/set-state-in-effect -- one-time reset when the modal opens */
    setStep(0)
    setAnswers({})
    setPhase('questions')
    setSelected(0)
    setOpenGloss(null)
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
  const isReco = activeIndex === 0
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
    setOpenGloss(null)
    if (step >= totalSteps - 1) {
      setPhase('result')
      setSelected(0)
    } else {
      setStep((current) => current + 1)
    }
  }
  const back = () => {
    setOpenGloss(null)
    setStep((current) => Math.max(0, current - 1))
  }
  const editAnswer = (index: number) => {
    setPhase('questions')
    setStep(index)
    setOpenGloss(null)
  }
  const reset = () => {
    setStep(0)
    setAnswers({})
    setPhase('questions')
    setSelected(0)
    setOpenGloss(null)
    setWeekOpen(false)
  }
  const selectPlan = (index: number) => {
    setSelected(index)
    setOpenGloss(null)
    setWeekOpen(false)
  }
  const start = () => {
    if (activeRec) onStart(activeRec.template.id)
  }

  const progressPct = Math.round(((step + 1) / totalSteps) * 100)

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
        <div className="flex h-full flex-col overflow-hidden sm:max-h-[88dvh] md:h-[680px] md:max-h-none md:flex-row">
          {/* LEFT — question */}
          <div
            className="flex min-h-0 flex-1 flex-col p-5 md:w-[360px] md:flex-none md:border-r"
            style={{ borderColor: 'var(--mantine-color-default-border)' }}
          >
            <ModalHeader onClose={onClose} />

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <SectionLabel size="0.625rem">
                  Question {step + 1} of {totalSteps}
                </SectionLabel>
                <Caption fw={800} tone="action">
                  {progressPct}%
                </Caption>
              </div>
              <ProgressBar pct={progressPct} />
            </div>

            <Heading order={2} size="1.25rem" lh={1.25} mt="lg">
              {question.title}
            </Heading>
            <Caption component="p" mt={6} lh={1.5}>
              {question.helper}
            </Caption>

            <div className="mt-4 flex flex-col gap-2.5">
              {question.options.map((option) => (
                <OptionCard
                  key={String(option.value)}
                  selected={answers[question.key] === option.value}
                  label={option.label}
                  sub={option.sub}
                  onClick={() => choose(option.value)}
                />
              ))}
            </div>

            <div className="flex-1" />
            {step > 0 ? (
              <button
                type="button"
                onClick={back}
                className="mt-4 inline-flex items-center gap-1.5 self-start py-1"
                style={{ color: 'var(--mantine-color-dimmed)' }}
              >
                <ChevronLeft size={16} />
                <Caption component="span" fw={600} c="inherit">
                  Back
                </Caption>
              </button>
            ) : null}
          </div>

          {/* RIGHT — reassurance (desktop only) */}
          <div className="hidden min-h-0 flex-1 md:flex md:flex-col" style={{ backgroundColor: 'var(--vf-surface-2)' }}>
            <div className="flex h-full flex-col p-7">
              <SectionLabel>So far</SectionLabel>
              {RECAP_KEYS.some((key) => answers[key] != null) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {RECAP_KEYS.filter((key) => answers[key] != null).map((key) => (
                    <span key={key} className="vf-chip" data-active="true">
                      <Caption component="span" fw={700} c="inherit">
                        {answerLabel(key, answers[key])}
                      </Caption>
                    </span>
                  ))}
                </div>
              ) : (
                <Text component="p" size="sm" tone="dimmed" fw={600} mt="sm" maw="22rem">
                  Answer on the left and your picks show up here. We&apos;ll keep it to three quick questions.
                </Text>
              )}

              <div className="mt-auto">
                <Panel p="md">
                  <Heading order={3} size="0.95rem" lh={1.2}>
                    Whatever you pick, Sheetless handles the rest
                  </Heading>
                  <div className="mt-3.5 flex flex-col gap-3">
                    <Reassurance icon={<Scale size={15} color="var(--vf-action-text)" />}>
                      Your starting weights, worked out for you
                    </Reassurance>
                    <Reassurance icon={<TrendingUp size={15} color="var(--vf-action-text)" />}>
                      When to add weight, every session
                    </Reassurance>
                    <Reassurance icon={<RefreshCw size={15} color="var(--vf-action-text)" />}>
                      A different plan anytime — nothing&apos;s locked in
                    </Reassurance>
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden sm:max-h-[88dvh] md:h-[680px] md:max-h-none">
          <div className="border-b px-5 py-4 md:px-7" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
            <ModalHeader onClose={onClose} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--vf-surface-2)' }}>
            <div className="mx-auto max-w-[40rem] p-5 pb-8 md:p-7 md:pb-10">
              {/* editable recap */}
              <div className="flex flex-wrap items-center gap-2">
                {FIND_MY_PLAN_QUESTIONS.map((item, index) => (
                  <button key={item.key} type="button" onClick={() => editAnswer(index)} className="vf-chip" data-active="true">
                    <Caption component="span" fw={700} c="inherit">
                      {answerLabel(item.key, answers[item.key])}
                    </Caption>
                    <Pencil size={11} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 px-1 py-1"
                  style={{ color: 'var(--mantine-color-dimmed)' }}
                >
                  <RotateCcw size={14} />
                  <Caption component="span" fw={600} c="inherit">
                    Start over
                  </Caption>
                </button>
              </div>

              {activeRec ? (
                <div className="mt-4">
                  <Badge color={isReco ? 'action' : 'warning'} variant="light" radius="xl">
                    {isReco ? 'We recommend' : 'Also a good fit'}
                  </Badge>
                  <Heading order={2} size="1.5rem" lh={1.15} mt="sm">
                    {activeRec.family.name}
                  </Heading>
                  <Text component="p" size="sm" fw={700} mt={4}>
                    Recommended schedule: {activeRec.template.variantLabel ?? activeRec.template.name}
                  </Text>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge color={levelTone(activeRec.template.complexity)} variant="light">
                      {activeRec.template.complexity}
                    </Badge>
                    <Caption>{activeRec.template.daysPerWeek} days/week</Caption>
                    <span className="h-1 w-1 rounded-full" style={{ backgroundColor: 'var(--mantine-color-dimmed)' }} />
                    <Caption>{activeRec.template.progressionLabel}</Caption>
                  </div>
                  <Text component="p" size="sm" tone="dimmed" fw={600} mt="sm" lh={1.55}>
                    {activeRec.reason}
                  </Text>

                  {/* tags (tap to explain) */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeRec.template.tags.map((tag) => {
                      const gloss = TAG_GLOSSARY[tag]
                      return (
                        <button
                          key={tag}
                          type="button"
                          disabled={!gloss}
                          onClick={() => setOpenGloss((current) => (current === tag ? null : tag))}
                          className="vf-chip"
                          data-active={openGloss === tag ? 'true' : undefined}
                          style={gloss ? undefined : { cursor: 'default' }}
                        >
                          <Caption component="span" fw={700} c="inherit">
                            {tagLabel(tag)}
                          </Caption>
                          {gloss ? <Info size={11} /> : null}
                        </button>
                      )
                    })}
                  </div>
                  {openGloss && TAG_GLOSSARY[openGloss] ? (
                    <Panel surface="inset" className="mt-2.5" px="sm" py="xs">
                      <Caption component="p" lh={1.5}>
                        {TAG_GLOSSARY[openGloss]}
                      </Caption>
                    </Panel>
                  ) : null}

                  {/* typical week */}
                  <div className="mt-5 flex items-center justify-between">
                    <SectionLabel className="hidden md:block">A typical week</SectionLabel>
                    <button
                      type="button"
                      onClick={() => setWeekOpen((current) => !current)}
                      className="inline-flex items-center gap-1 md:hidden"
                    >
                      <Caption component="span" fw={700} tone="action">
                        {weekOpen ? 'Hide the week' : "See what's inside"}
                      </Caption>
                      <ChevronDown
                        size={16}
                        color="var(--vf-action-text)"
                        style={{ transform: weekOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}
                      />
                    </button>
                  </div>
                  <div className={cn('mt-3 flex-col gap-2', weekOpen ? 'flex' : 'hidden', 'md:flex')}>
                    {weekLoading ? (
                      <Caption>Loading the week…</Caption>
                    ) : weekSessions.length ? (
                      weekSessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-start gap-3 rounded-xl border p-3"
                          style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--mantine-color-default)' }}
                        >
                          <span className="shrink-0 rounded-md px-2 py-1" style={{ backgroundColor: 'var(--vf-action-soft)' }}>
                            <Caption component="span" fw={800} tone="action">
                              {session.label}
                            </Caption>
                          </span>
                          <div className="min-w-0">
                            <Text component="p" size="sm" fw={700}>
                              {session.title}
                            </Text>
                            <Caption component="p" mt={2} lh={1.4}>
                              {session.movementSummary}
                            </Caption>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Caption>Plan preview is unavailable right now.</Caption>
                    )}
                  </div>

                  {/* actions */}
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <Button className="flex-1" onClick={start}>
                      <Check size={16} />
                      View plan
                    </Button>
                    {showBrowseAll ? (
                      <Button variant="default" onClick={onClose}>
                        Browse all
                      </Button>
                    ) : null}
                  </div>

                  {/* other good fits */}
                  {goodFits.length ? (
                    <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                      <SectionLabel>Other good fits</SectionLabel>
                      <div className="mt-3 flex flex-col gap-2">
                        {goodFits.map(({ rec, index }) => (
                          <button
                            key={rec.template.id}
                            type="button"
                            onClick={() => selectPlan(index)}
                            className="vf-card-hover flex items-center gap-3 rounded-xl border p-3 text-left"
                            style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--mantine-color-default)' }}
                          >
                            <span
                              className="h-9 w-1 shrink-0 rounded-full"
                              style={{ backgroundColor: `var(--vf-${levelTone(rec.template.complexity)}-text)` }}
                            />
                            <span className="min-w-0 flex-1">
                              <Text component="span" size="sm" fw={700} className="block" truncate>
                                {rec.family.name}
                              </Text>
                              <Caption component="span" className="block">
                                {rec.template.complexity} · {rec.template.variantShortLabel ?? `${rec.template.daysPerWeek} days`} · {rec.template.progressionLabel}
                              </Caption>
                            </span>
                            <ChevronRight size={16} color="var(--mantine-color-dimmed)" className="shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Text component="p" tone="dimmed" fw={600} mt="md">
                  No plans are available right now.
                </Text>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
        >
          <Sparkles size={16} color="var(--vf-action-text)" />
        </span>
        <Text component="span" fw={800}>
          Find my plan
        </Text>
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-lg transition"
        style={{ color: 'var(--mantine-color-dimmed)' }}
      >
        <X size={18} />
      </button>
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-3)' }}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, backgroundColor: 'var(--vf-action-text)' }}
      />
    </div>
  )
}

function OptionCard({
  selected,
  label,
  sub,
  onClick,
}: {
  selected: boolean
  label: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition"
      style={{
        borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
        backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
      }}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
        style={{
          borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
          backgroundColor: selected ? 'var(--mantine-primary-color-filled)' : 'transparent',
        }}
      >
        {selected ? <Check size={12} color="white" /> : null}
      </span>
      <span className="min-w-0">
        <Text component="span" size="sm" fw={700} className="block">
          {label}
        </Text>
        <Caption component="span" className="block">
          {sub}
        </Caption>
      </span>
    </button>
  )
}

function Reassurance({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--vf-action-soft)' }}>
        {icon}
      </span>
      <Text component="span" size="sm" fw={600}>
        {children}
      </Text>
    </div>
  )
}
