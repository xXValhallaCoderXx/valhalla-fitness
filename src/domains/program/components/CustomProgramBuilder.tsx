import { ActionIcon, Badge, Button, Card, NumberInput, Select, TextInput, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleCheck, Gauge, Info, PencilLine, Plus, Trash2, Wand2, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { getMovementName } from '~/domains/movement/lib/movements'
import {
  createDefaultCustomProgramBuilderInput,
  customProgramMethodologies,
  MAX_ACCESSORIES_PER_DAY,
  MAX_LOGGER_EXERCISES_PER_DAY,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '~/domains/program/lib/custom-templates'
import {
  evaluateCustomProgramDraft,
  hasBlockingIssue,
  recommendedDaysFor,
  type GuidanceCheck,
  type GuidanceIssue,
  type GuidanceSeverity,
} from '~/domains/program/lib/custom-builder-guidance'
import { buildProgressionPreviews, type ProgressionPreview } from '~/domains/program/lib/custom-builder-preview'
import { ProgramInfoHint } from '~/domains/program/components/ProgramInfoHint'
import { meQueryOptions } from '~/domains/account/queries'
import {
  accessoryMovementOptions,
  clampBuilderDayCount,
  clampIntegerInput,
  customBuilderDayTitle,
  customBuilderStepsFor,
  loggerMovementOptions,
  mainMovementOptions,
  mainWorkSummary,
  resizeCustomSessions,
  variationMovementOptions,
  variationSummary,
  type CustomBuilderStep,
} from '~/domains/program/lib/custom-builder-ui'
import { createCustomProgramTemplateFn } from '~/domains/program/server/program-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import type { ProgramTemplateSummary, UserProfile } from '~/shared/types'

const GUIDANCE_SEVERITY_STYLE: Record<GuidanceSeverity, { style: CSSProperties; Icon: typeof AlertTriangle }> = {
  block: {
    style: { borderColor: 'var(--vf-danger-border)', backgroundColor: 'var(--vf-danger-soft)', color: 'var(--vf-danger-text)' },
    Icon: AlertTriangle,
  },
  warning: {
    style: { borderColor: 'var(--vf-warning-border)', backgroundColor: 'var(--vf-warning-soft)', color: 'var(--vf-warning-text)' },
    Icon: AlertTriangle,
  },
  info: {
    style: { borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)', color: 'var(--vf-action-text)' },
    Icon: Info,
  },
}

const GUIDANCE_SEVERITY_ORDER: Record<GuidanceSeverity, number> = { block: 0, warning: 1, info: 2 }

function issuesForChecks(issues: GuidanceIssue[], checks: GuidanceCheck[]) {
  return issues.filter((issue) => checks.includes(issue.check))
}

function issuesForScope(issues: GuidanceIssue[], scope: 'global' | number) {
  return issues.filter((issue) => issue.scope === scope)
}

function GuidanceList({ issues, className }: { issues: GuidanceIssue[]; className?: string }) {
  if (!issues.length) return null
  return (
    <div className={`grid gap-2${className ? ` ${className}` : ''}`}>
      {issues.map((issue) => {
        const { style, Icon } = GUIDANCE_SEVERITY_STYLE[issue.severity]
        return (
          <div key={issue.id} className="flex items-start gap-2.5 rounded-xl border p-3" style={style}>
            <Icon size={16} className="mt-0.5 shrink-0" />
            <Text size="sm" fw={600} c="inherit">
              {issue.message}
              {issue.fix ? (
                <Text component="span" display="block" size="sm" fw={400} c="inherit" mt={2} style={{ opacity: 0.85 }}>
                  {issue.fix}
                </Text>
              ) : null}
            </Text>
          </div>
        )
      })}
    </div>
  )
}

export function CustomProgramBuilder({
  titleId,
  onClose,
  onCreated,
}: {
  titleId: string
  onClose: () => void
  onCreated: (template: ProgramTemplateSummary) => void | Promise<void>
}) {
  const [step, setStep] = useState<CustomBuilderStep>('methodology')
  const [draft, setDraft] = useState<CustomProgramBuilderInput>(() => createDefaultCustomProgramBuilderInput())
  const steps = customBuilderStepsFor(draft.methodology)
  const currentStepIndex = steps.findIndex((item) => item.id === step)
  const isReview = step === 'review'
  const mutation = useMutation({
    mutationFn: () => createCustomProgramTemplateFn({ data: draft }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not create programme',
        message: getApiErrorMessage(error, 'Unable to create custom programme'),
      })
    },
    onSuccess: (template) => {
      void onCreated(template)
    },
  })

  const updateDraft = (patch: Partial<CustomProgramBuilderInput>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }

  const setMethodology = (methodology: CustomProgramMethodology) => {
    setDraft((current) => {
      const daysPerWeek = clampBuilderDayCount(current.daysPerWeek, 3)
      const next = createDefaultCustomProgramBuilderInput({ methodology, daysPerWeek })
      return {
        ...next,
        name: current.name,
        goal: current.goal,
      }
    })
  }

  const setDaysPerWeek = (daysPerWeek: number) => {
    setDraft((current) => {
      const nextDaysPerWeek = clampBuilderDayCount(daysPerWeek, current.daysPerWeek)
      return resizeCustomSessions(current, nextDaysPerWeek)
    })
  }

  const updateSession = (
    sessionIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]>,
  ) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex ? { ...session, ...patch } : session,
      ),
    }))
  }

  const updateAccessory = (
    sessionIndex: number,
    accessoryIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]['accessories'][number]>,
  ) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex
          ? {
              ...session,
              accessories: session.accessories.map((accessory, itemIndex) =>
                itemIndex === accessoryIndex ? { ...accessory, ...patch } : accessory,
              ),
            }
          : session,
      ),
    }))
  }

  const addAccessory = (sessionIndex: number) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex && session.accessories.length < MAX_ACCESSORIES_PER_DAY
          ? {
              ...session,
              accessories: [
                ...session.accessories,
                {
                  movementId: accessoryMovementOptions[0]?.id ?? 'face_pull',
                  setCount: 3,
                  repMin: 10,
                  repMax: 15,
                  progressionMethod: 'history_only',
                },
              ],
            }
          : session,
      ),
    }))
  }

  const removeAccessory = (sessionIndex: number, accessoryIndex: number) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex
          ? {
              ...session,
              accessories: session.accessories.filter((_, itemIndex) => itemIndex !== accessoryIndex),
            }
          : session,
      ),
    }))
  }

  const updateLoggerExercise = (
    sessionIndex: number,
    exerciseIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]['loggerExercises'][number]>,
  ) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex
          ? {
              ...session,
              loggerExercises: session.loggerExercises.map((exercise, itemIndex) =>
                itemIndex === exerciseIndex ? { ...exercise, ...patch } : exercise,
              ),
            }
          : session,
      ),
    }))
  }

  const addLoggerExercise = (sessionIndex: number) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex && session.loggerExercises.length < MAX_LOGGER_EXERCISES_PER_DAY
          ? {
              ...session,
              loggerExercises: [
                ...session.loggerExercises,
                {
                  movementId: loggerMovementOptions[0]?.id ?? 'squat',
                  setCount: 3,
                  repMin: 8,
                  repMax: 12,
                  targetRir: 2,
                },
              ],
            }
          : session,
      ),
    }))
  }

  const removeLoggerExercise = (sessionIndex: number, exerciseIndex: number) => {
    setDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session, index) =>
        index === sessionIndex
          ? {
              ...session,
              loggerExercises: session.loggerExercises.filter((_, itemIndex) => itemIndex !== exerciseIndex),
            }
          : session,
      ),
    }))
  }

  const moveStep = (direction: 1 | -1) => {
    const next = steps[currentStepIndex + direction]
    if (next) setStep(next.id)
  }

  const meQuery = useQuery(meQueryOptions())
  const issues = useMemo(() => evaluateCustomProgramDraft(draft), [draft])
  const canCreate = !hasBlockingIssue(issues)

  return (
    <Card className="flex h-full max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl rounded-b-none sm:max-h-[92dvh] sm:rounded-lg" p={0}>
      <div className="shrink-0 border-b p-3 sm:p-4" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
            >
              <Wand2 size={21} color="var(--vf-action-text)" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Heading id={titleId} order={2} size="h3" className="truncate">
                  Create programme
                </Heading>
                <Badge color="action">Custom</Badge>
              </div>
              <Text mt={3} size="sm" tone="dimmed">
                Build a constrained template from supported methodology presets.
              </Text>
            </div>
          </div>
          <Tooltip label="Close">
            <ActionIcon
              color="neutral"
              variant="subtle"
              size="lg"
              aria-label="Close"
              className="shrink-0"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              <X size={18} />
            </ActionIcon>
          </Tooltip>
        </div>

        <BuilderStepNavigation
          steps={steps}
          currentStep={step}
          disabled={mutation.isPending}
          onStepChange={setStep}
        />
        {step !== 'methodology' ? <CurrentPlanSummary draft={draft} /> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
        {step === 'methodology' ? (
          <CustomMethodologyStep
            draft={draft}
            issues={issuesForChecks(issues, ['name', 'schedule_fit'])}
            onDraftChange={updateDraft}
            onMethodologyChange={setMethodology}
            onDaysChange={setDaysPerWeek}
          />
        ) : step === 'main_lifts' && draft.methodology === 'none' ? (
          <CustomLoggerExercisesStep
            draft={draft}
            issues={issuesForChecks(issues, ['logger_empty', 'session_count'])}
            onSessionChange={updateSession}
            onExerciseChange={updateLoggerExercise}
            onAddExercise={addLoggerExercise}
            onRemoveExercise={removeLoggerExercise}
          />
        ) : step === 'main_lifts' ? (
          <CustomMovementsStep
            draft={draft}
            issues={issuesForChecks(issues, ['duplicate_main', 'weekly_balance', 'session_count'])}
            onSessionChange={updateSession}
          />
        ) : step === 'accessories' && draft.methodology !== 'none' ? (
          <CustomAccessoriesStep
            draft={draft}
            issues={issuesForChecks(issues, ['accessory_volume'])}
            onAccessoryChange={updateAccessory}
            onAddAccessory={addAccessory}
            onRemoveAccessory={removeAccessory}
          />
        ) : (
          <CustomReviewStep draft={draft} issues={issues} profile={meQuery.data ?? null} />
        )}
      </div>

      <div
        className="shrink-0 border-t p-3 pb-[calc(1.75rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-3"
        style={{ borderColor: 'var(--mantine-color-default-border)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <Button variant="default" className="shrink-0" disabled={mutation.isPending || currentStepIndex === 0} onClick={() => moveStep(-1)}>
            <ChevronLeft size={14} />
            Back
          </Button>
          {!isReview ? (
            <Button className="shrink-0" disabled={mutation.isPending} onClick={() => moveStep(1)}>
              Next
              <ChevronRight size={14} />
            </Button>
          ) : (
            <Button className="shrink-0" disabled={mutation.isPending || !canCreate} loading={mutation.isPending} onClick={() => mutation.mutate()}>
              <Check size={16} />
              Create programme
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function BuilderStepNavigation({
  steps,
  currentStep,
  disabled,
  onStepChange,
}: {
  steps: Array<{ id: CustomBuilderStep; label: string }>
  currentStep: CustomBuilderStep
  disabled: boolean
  onStepChange: (step: CustomBuilderStep) => void
}) {
  const currentIndex = steps.findIndex((item) => item.id === currentStep)
  return (
    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar md:mt-4 md:gap-2">
      {steps.map((item, index) => (
        <BuilderStepTab
          key={item.id}
          index={index}
          label={item.label}
          active={currentStep === item.id}
          done={index < currentIndex}
          disabled={disabled}
          onClick={() => onStepChange(item.id)}
        />
      ))}
    </div>
  )
}

function BuilderStepTab({
  index,
  label,
  active,
  done,
  disabled,
  onClick,
}: {
  index: number
  label: string
  active: boolean
  done: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 transition-colors md:min-w-0 md:flex-1"
      style={{
        backgroundColor: active ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
        borderColor: active ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)',
        opacity: disabled ? 0.55 : 1,
      }}
      disabled={disabled}
      onClick={onClick}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: done ? 'var(--vf-success-text)' : active ? 'var(--vf-action-text)' : 'var(--vf-surface-3)',
          color: done || active ? 'var(--mantine-color-white)' : 'var(--mantine-color-dimmed)',
          fontSize: '0.625rem',
          fontWeight: 800,
        }}
      >
        {done ? <Check size={12} strokeWidth={3} /> : index + 1}
      </span>
      <Caption component="span" fw={800} truncate c={active ? 'var(--vf-action-text)' : undefined}>
        {label}
      </Caption>
    </button>
  )
}

function CurrentPlanSummary({ draft }: { draft: CustomProgramBuilderInput }) {
  const methodology = customProgramMethodologies[draft.methodology]
  return (
    <Panel surface="inset" className="mt-3" px="sm" py="xs">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Text size="xs" fw={900} truncate className="max-w-full sm:max-w-[16rem]">
          {draft.name.trim() || 'Untitled programme'}
        </Text>
        <Badge color={draft.methodology === 'none' ? 'neutral' : 'action'}>{methodology.shortLabel}</Badge>
        <Caption fw={700}>{draft.daysPerWeek} days/week</Caption>
        {draft.goal?.trim() ? (
          <Caption fw={700} truncate className="max-w-full sm:max-w-[24rem]">
            Goal: {draft.goal.trim()}
          </Caption>
        ) : null}
      </div>
    </Panel>
  )
}

function CustomMethodologyStep({
  draft,
  issues,
  onDraftChange,
  onMethodologyChange,
  onDaysChange,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  onDraftChange: (patch: Partial<CustomProgramBuilderInput>) => void
  onMethodologyChange: (methodology: CustomProgramMethodology) => void
  onDaysChange: (daysPerWeek: number) => void
}) {
  const recommendedDays = recommendedDaysFor(draft.methodology)
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem]">
        <TextInput
          label="Programme name"
          value={draft.name}
          onChange={(event) => onDraftChange({ name: event.target.value })}
        />
        <TextInput
          label="Goal"
          placeholder="e.g. Add 10kg to squat"
          value={draft.goal ?? ''}
          onChange={(event) => onDraftChange({ goal: event.target.value })}
        />
        <NumberInput
          label={
            <span className="inline-flex items-center gap-1">
              Days per week
              <ProgramInfoHint label="Day count guidance">{recommendedDays.rationale}</ProgramInfoHint>
            </span>
          }
          min={1}
          max={7}
          allowDecimal={false}
          clampBehavior="strict"
          value={draft.daysPerWeek}
          onChange={(value) => onDaysChange(clampBuilderDayCount(value, draft.daysPerWeek))}
        />
      </div>

      <GuidanceList issues={issues} />

      <div>
        <SectionLabel className="mb-4">How should Sheetless regulate you?</SectionLabel>
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(customProgramMethodologies) as CustomProgramMethodology[]).map((methodology) => {
            const option = customProgramMethodologies[methodology]
            const selected = draft.methodology === methodology
            return (
              <button
                key={methodology}
                type="button"
                className="rounded-xl border p-4 text-left transition"
                style={{
                  borderColor: selected ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)',
                  backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
                  boxShadow: selected ? '0 0 0 1px var(--vf-action-border)' : undefined,
                }}
                onClick={() => onMethodologyChange(methodology)}
              >
                <span className="flex items-start justify-between gap-2">
                  <Text component="span" display="block" size="md" fw={800}>
                    {option.label}
                  </Text>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Tooltip label={option.tooltip} multiline w={260}>
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Info size={15} color="var(--mantine-color-dimmed)" />
                      </span>
                    </Tooltip>
                    {selected ? (
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: 'var(--vf-action-text)', color: 'var(--mantine-color-white)' }}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                    ) : (
                      <Badge color={methodology === 'none' ? 'neutral' : 'action'} variant="light">
                        {option.complexity}
                      </Badge>
                    )}
                  </span>
                </span>
                <Text component="span" display="block" mt={6} size="xs" tone="dimmed">
                  {option.description}
                </Text>
                <span
                  className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5"
                  style={{
                    backgroundColor: selected ? 'var(--mantine-color-default)' : 'var(--vf-surface-2)',
                    border: '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  <Gauge size={14} color="var(--vf-action-text)" className="mt-0.5 shrink-0" />
                  <Caption component="span" fw={600}>
                    {option.regulationSummary}
                  </Caption>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ProgrammingCheckBanner({ issues }: { issues: GuidanceIssue[] }) {
  // `issues` are already filtered to the programming-relevant checks (duplicate_main,
  // weekly_balance, session_count) and may be day-scoped, so surface them all here.
  const ordered = [...issues].sort(
    (left, right) => GUIDANCE_SEVERITY_ORDER[left.severity] - GUIDANCE_SEVERITY_ORDER[right.severity],
  )
  return (
    <div className="grid gap-2">
      <SectionLabel>Programming check</SectionLabel>
      {ordered.length ? (
        <GuidanceList issues={ordered} />
      ) : (
        <div
          className="flex items-center gap-2.5 rounded-xl border p-3"
          style={{ borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)', color: 'var(--vf-success-text)' }}
        >
          <CircleCheck size={16} className="shrink-0" />
          <Text size="sm" fw={600} c="inherit">
            Looks balanced — one main lift per day.
          </Text>
        </div>
      )}
    </div>
  )
}

function CustomMovementsStep({
  draft,
  issues,
  onSessionChange,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  onSessionChange: (sessionIndex: number, patch: Partial<CustomProgramBuilderInput['sessions'][number]>) => void
}) {
  const supportsVariation = draft.methodology === 'plus_set_wave'
  return (
    <div className="grid gap-3">
      <Panel surface="inset" p="sm">
        <SectionLabel>Regulated structure</SectionLabel>
        <Caption mt={4}>{customProgramMethodologies[draft.methodology].regulationSummary}</Caption>
      </Panel>
      <ProgrammingCheckBanner issues={issues} />
      {draft.sessions.map((session, index) => (
        <Panel key={index} surface="inset" p="sm">
          <Text mb="sm" size="sm" fw={800}>{customBuilderDayTitle(index, session.mainMovementId)}</Text>
          <div className="grid gap-3 md:grid-cols-2 md:items-start">
            <div className="grid gap-3">
              <BuilderSelect
                label="Main lift"
                value={session.mainMovementId}
                onChange={(value) => {
                  if (!value) return
                  onSessionChange(index, {
                    mainMovementId: value,
                    title: customBuilderDayTitle(index, value),
                  })
                }}
                options={mainMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
              />
              {supportsVariation ? (
                <BuilderSelect
                  label="Variation"
                  value={session.variationMovementId ?? null}
                  onChange={(value) => onSessionChange(index, { variationMovementId: value || null })}
                  options={variationMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
                  clearable
                  placeholder="None"
                />
              ) : null}
            </div>
            <Panel surface="panel" className="min-w-0" p="sm">
              <SectionLabel>Main prescription</SectionLabel>
              <Text mt={4} size="sm" fw={800}>{mainWorkSummary(draft.methodology, session)}</Text>
              <Caption mt={4}>{customProgramMethodologies[draft.methodology].progressionLabel}</Caption>
            </Panel>
          </div>
        </Panel>
      ))}
    </div>
  )
}

function CustomLoggerExercisesStep({
  draft,
  issues,
  onSessionChange,
  onExerciseChange,
  onAddExercise,
  onRemoveExercise,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  onSessionChange: (sessionIndex: number, patch: Partial<CustomProgramBuilderInput['sessions'][number]>) => void
  onExerciseChange: (
    sessionIndex: number,
    exerciseIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]['loggerExercises'][number]>,
  ) => void
  onAddExercise: (sessionIndex: number) => void
  onRemoveExercise: (sessionIndex: number, exerciseIndex: number) => void
}) {
  return (
    <div className="grid gap-3">
      <Panel surface="inset" p="sm">
        <div className="flex items-start gap-2.5">
          <PencilLine size={16} color="var(--mantine-color-dimmed)" className="mt-0.5 shrink-0" />
          <div>
            <SectionLabel>Logger-only exercises</SectionLabel>
            <Caption mt={4}>
              Add the exercises you want to repeat each day. Loads stay user-selected while logging and no progression rules are created.
            </Caption>
          </div>
        </div>
      </Panel>

      {draft.sessions.map((session, sessionIndex) => (
        <Panel key={sessionIndex} surface="inset" p="sm">
          <GuidanceList issues={issuesForScope(issues, sessionIndex)} className="mb-3" />
          <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <TextInput
              label={`Day ${sessionIndex + 1} title`}
              value={session.title}
              onChange={(event) => onSessionChange(sessionIndex, { title: event.target.value })}
            />
            <Tooltip
              label={`Up to ${MAX_LOGGER_EXERCISES_PER_DAY} exercises per day`}
              disabled={session.loggerExercises.length < MAX_LOGGER_EXERCISES_PER_DAY}
            >
              <span>
                <Button
                  variant="default"
                  disabled={session.loggerExercises.length >= MAX_LOGGER_EXERCISES_PER_DAY}
                  onClick={() => onAddExercise(sessionIndex)}
                >
                  <Plus size={14} />
                  Add exercise
                </Button>
              </span>
            </Tooltip>
          </div>

          <div className="grid gap-2">
            {session.loggerExercises.map((exercise, exerciseIndex) => (
              <BuilderExerciseRow
                key={exerciseIndex}
                select={
                  <BuilderSelect
                    label="Exercise"
                    value={exercise.movementId}
                    onChange={(value) => {
                      if (!value) return
                      onExerciseChange(sessionIndex, exerciseIndex, { movementId: value })
                    }}
                    options={loggerMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
                  />
                }
                numbers={
                  <>
                    <BuilderNumberField
                      label="Sets"
                      value={exercise.setCount}
                      min={1}
                      max={10}
                      onChange={(value) => onExerciseChange(sessionIndex, exerciseIndex, { setCount: value })}
                    />
                    <BuilderNumberField
                      label="Min"
                      value={exercise.repMin}
                      min={1}
                      max={50}
                      onChange={(value) => onExerciseChange(sessionIndex, exerciseIndex, { repMin: value })}
                    />
                    <BuilderNumberField
                      label="Max"
                      value={exercise.repMax}
                      min={1}
                      max={50}
                      onChange={(value) => onExerciseChange(sessionIndex, exerciseIndex, { repMax: value })}
                    />
                    <BuilderNumberField
                      label="RIR"
                      value={exercise.targetRir ?? 0}
                      min={0}
                      max={10}
                      onChange={(value) => onExerciseChange(sessionIndex, exerciseIndex, { targetRir: value })}
                    />
                  </>
                }
                numberColumns="four"
                action={
                  <DeleteRowAction
                    label="Remove exercise"
                    disabled={session.loggerExercises.length <= 1}
                    onClick={() => onRemoveExercise(sessionIndex, exerciseIndex)}
                  />
                }
              />
            ))}
            {!session.loggerExercises.length ? (
              <Panel surface="panel" p="sm">
                <Text size="sm" tone="dimmed">No exercises yet — add the first one.</Text>
              </Panel>
            ) : null}
          </div>
        </Panel>
      ))}
    </div>
  )
}

function CustomAccessoriesStep({
  draft,
  issues,
  onAccessoryChange,
  onAddAccessory,
  onRemoveAccessory,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  onAccessoryChange: (
    sessionIndex: number,
    accessoryIndex: number,
    patch: Partial<CustomProgramBuilderInput['sessions'][number]['accessories'][number]>,
  ) => void
  onAddAccessory: (sessionIndex: number) => void
  onRemoveAccessory: (sessionIndex: number, accessoryIndex: number) => void
}) {
  return (
    <div className="grid gap-3">
      {draft.sessions.map((session, sessionIndex) => {
        const atAccessoryCap = session.accessories.length >= MAX_ACCESSORIES_PER_DAY
        return (
        <Panel key={sessionIndex} surface="inset" p="sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Text size="sm" fw={800}>{customBuilderDayTitle(sessionIndex, session.mainMovementId)}</Text>
              <div className="mt-2 flex flex-wrap gap-2">
                <Panel surface="panel" px="xs" py={4}>
                  <Caption fw={600}>{mainWorkSummary(draft.methodology, session)}</Caption>
                </Panel>
                <Panel surface="panel" px="xs" py={4}>
                  <Caption fw={600}>Variation: {variationSummary(session)}</Caption>
                </Panel>
              </div>
            </div>
            <Tooltip label={`Up to ${MAX_ACCESSORIES_PER_DAY} accessories per day`} disabled={!atAccessoryCap}>
              <span>
                <Button variant="default" disabled={atAccessoryCap} onClick={() => onAddAccessory(sessionIndex)}>
                  <Plus size={14} />
                  Add
                </Button>
              </span>
            </Tooltip>
          </div>
          <GuidanceList issues={issuesForScope(issues, sessionIndex)} className="mt-3" />
          <div className="mt-3 grid gap-2">
            {session.accessories.map((accessory, accessoryIndex) => (
              <BuilderExerciseRow
                key={accessoryIndex}
                select={
                  <BuilderSelect
                    label="Movement"
                    value={accessory.movementId}
                    onChange={(value) => {
                      if (!value) return
                      onAccessoryChange(sessionIndex, accessoryIndex, { movementId: value })
                    }}
                    options={accessoryMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
                  />
                }
                numbers={
                  <>
                    <BuilderNumberField
                      label="Sets"
                      value={accessory.setCount}
                      min={1}
                      max={8}
                      onChange={(value) => onAccessoryChange(sessionIndex, accessoryIndex, { setCount: value })}
                    />
                    <BuilderNumberField
                      label="Min"
                      value={accessory.repMin}
                      min={1}
                      max={50}
                      onChange={(value) => onAccessoryChange(sessionIndex, accessoryIndex, { repMin: value })}
                    />
                    <BuilderNumberField
                      label="Max"
                      value={accessory.repMax}
                      min={1}
                      max={50}
                      onChange={(value) => onAccessoryChange(sessionIndex, accessoryIndex, { repMax: value })}
                    />
                  </>
                }
                numberColumns="three"
                action={
                  <DeleteRowAction
                    label="Remove accessory"
                    onClick={() => onRemoveAccessory(sessionIndex, accessoryIndex)}
                  />
                }
              />
            ))}
            {!session.accessories.length ? (
              <Panel surface="panel" p="sm">
                <Text size="sm" tone="dimmed">No accessories yet — add some, or keep the day to just the main lift.</Text>
              </Panel>
            ) : null}
          </div>
        </Panel>
        )
      })}
    </div>
  )
}

function CustomReviewStep({
  draft,
  issues,
  profile,
}: {
  draft: CustomProgramBuilderInput
  issues: GuidanceIssue[]
  profile: UserProfile | null
}) {
  const methodology = customProgramMethodologies[draft.methodology]
  const previews = useMemo(() => buildProgressionPreviews(draft, profile), [draft, profile])
  const orderedIssues = [...issues].sort(
    (left, right) => GUIDANCE_SEVERITY_ORDER[left.severity] - GUIDANCE_SEVERITY_ORDER[right.severity],
  )
  const accessoryCount = draft.sessions.reduce((total, session) => total + session.accessories.length, 0)
  const loggerExerciseCount = draft.sessions.reduce((total, session) => total + session.loggerExercises.length, 0)
  return (
    <div className="grid gap-4">
      <GuidanceList issues={orderedIssues} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ReviewMetric label="Method" value={methodology.shortLabel} />
        <ReviewMetric label="Schedule" value={`${draft.daysPerWeek} days/wk`} />
        <ReviewMetric label="Sessions" value={draft.sessions.length} />
        <ReviewMetric label={draft.methodology === 'none' ? 'Exercises' : 'Accessories'} value={draft.methodology === 'none' ? loggerExerciseCount : accessoryCount} />
      </div>
      {previews.length ? (
        <div className="grid gap-2">
          <span className="inline-flex items-center gap-1">
            <SectionLabel>Progression preview</SectionLabel>
            <ProgramInfoHint label="About this preview">
              Example loads per main lift so you can picture the plan. They assume average progress — your real numbers depend on what you log.
            </ProgramInfoHint>
          </span>
          <div className="grid gap-3">
            {previews.map((preview) => (
              <ProgressionPreviewPanel key={preview.movementId} preview={preview} />
            ))}
          </div>
        </div>
      ) : draft.methodology === 'none' ? (
        <div className="flex items-start gap-2.5 rounded-xl border p-3" style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--vf-surface-2)' }}>
          <PencilLine size={16} color="var(--mantine-color-dimmed)" className="mt-0.5 shrink-0" />
          <Text size="sm" tone="dimmed">
            <Text component="span" fw={800} tone="default">No auto-regulation.</Text> This is a pure logger — every set uses a load you pick while training.
          </Text>
        </div>
      ) : null}
      <Panel surface="inset" p="sm">
        <Text size="sm" fw={800}>{draft.name}</Text>
        {draft.goal ? <Caption mt={4}>{draft.goal}</Caption> : null}
        <Panel surface="panel" mt="sm" px="sm" py="xs">
          <Caption fw={600}>{methodology.regulationSummary}</Caption>
        </Panel>
        <div className="mt-3 grid gap-2">
          {draft.sessions.map((session, index) => (
            <Panel key={index} surface="panel" px="sm" py="xs">
              {draft.methodology === 'none' ? (
                <>
                  <Text fw={700}>{session.title || `Day ${index + 1}`}</Text>
                  <Caption mt={4}>
                    {session.loggerExercises.map((exercise) => getMovementName(exercise.movementId)).join(', ')}
                  </Caption>
                </>
              ) : (
                <>
                  <Text component="span" fw={700}>{customBuilderDayTitle(index, session.mainMovementId)}</Text>
                  <Caption component="span"> - {getMovementName(session.mainMovementId)}</Caption>
                  {session.variationMovementId ? (
                    <Caption component="span"> - {getMovementName(session.variationMovementId)}</Caption>
                  ) : null}
                  <Caption mt={4}>
                    {session.accessories.length} accessory {session.accessories.length === 1 ? 'slot' : 'slots'}
                  </Caption>
                </>
              )}
            </Panel>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function ReviewMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Panel surface="inset" p="sm">
      <SectionLabel>{label}</SectionLabel>
      <Text mt={4} size="sm" fw={800}>{value}</Text>
    </Panel>
  )
}

function ProgressionPreviewPanel({ preview }: { preview: ProgressionPreview }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--vf-success-border)', backgroundColor: 'var(--vf-success-soft)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text fw={800} tone="success">{preview.movementName}</Text>
        <Badge color={preview.isEstimated ? 'neutral' : 'success'}>
          {preview.isEstimated ? 'Example numbers' : 'From your 1RM'}
        </Badge>
      </div>
      <Caption mt={4} tone="success">
        {preview.anchorLabel} {preview.anchorValue} {preview.units}
        {preview.isEstimated ? ' (example — set yours when you start)' : ''}
      </Caption>
      <div className="mt-3 grid gap-1">
        {preview.rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(6rem,auto)_1fr_auto] items-center gap-2 border-t py-1.5 first:border-t-0 first:pt-0"
            style={{ borderColor: 'var(--vf-success-border)' }}
          >
            <Caption fw={800} tone="success">{row.label}</Caption>
            <Caption tone="success" style={{ opacity: 0.85 }}>{row.scheme}</Caption>
            <Text size="sm" fw={800} tone="success">{row.load} {preview.units}</Text>
          </div>
        ))}
      </div>
      <Caption mt={3} tone="success" style={{ opacity: 0.85 }}>{preview.note}</Caption>
    </div>
  )
}

function BuilderExerciseRow({
  select,
  numbers,
  numberColumns,
  action,
}: {
  select: ReactNode
  numbers: ReactNode
  numberColumns: 'three' | 'four'
  action: ReactNode
}) {
  const numberGridClass =
    numberColumns === 'four'
      ? 'grid grid-cols-2 gap-2 sm:grid-cols-4 md:w-[20rem]'
      : 'grid grid-cols-2 gap-2 sm:grid-cols-3 md:w-[15rem]'

  return (
    <Panel surface="panel" p="sm">
      <div className="grid gap-3 md:grid-cols-[minmax(12rem,20rem)_auto_auto] md:items-end">
        <div className="min-w-0">{select}</div>
        <div className={numberGridClass}>{numbers}</div>
        <div className="flex justify-end md:justify-start">{action}</div>
      </div>
    </Panel>
  )
}

function DeleteRowAction({
  label,
  disabled = false,
  onClick,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip label={label}>
      <span>
        <ActionIcon
          color="danger"
          variant="light"
          size="lg"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          <Trash2 size={16} />
        </ActionIcon>
      </span>
    </Tooltip>
  )
}

function BuilderSelect({
  label,
  value,
  options,
  disabled = false,
  clearable = false,
  placeholder,
  onChange,
}: {
  label: string
  value: string | null
  options: Array<{ value: string; label: string }>
  disabled?: boolean
  clearable?: boolean
  placeholder?: string
  onChange: (value: string | null) => void
}) {
  return (
    <Select
      label={label}
      value={value}
      data={options}
      disabled={disabled}
      clearable={clearable}
      searchable
      placeholder={placeholder}
      // Portal the dropdown over the modal and anchor it to the viewport so the on-screen
      // keyboard / modal scroll can't make it (and the modal) jump on mobile.
      comboboxProps={{ withinPortal: true, position: 'bottom-start', middlewares: { flip: true, shift: false } }}
      onChange={(nextValue) => {
        if (nextValue === null && !clearable) return
        onChange(nextValue)
      }}
    />
  )
}

function BuilderNumberField({
  label,
  value,
  min = 1,
  max = 50,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <NumberInput
      label={label}
      min={min}
      max={max}
      allowDecimal={false}
      clampBehavior="strict"
      value={value}
      onChange={(nextValue) => onChange(clampIntegerInput(nextValue, value, min, max))}
    />
  )
}
