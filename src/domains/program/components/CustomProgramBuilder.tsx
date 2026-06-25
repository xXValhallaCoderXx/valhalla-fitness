import { Badge, Button, Card, NumberInput, Select, TextInput, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Info, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { getMovementName } from '~/domains/movement/lib/movements'
import {
  createDefaultCustomProgramBuilderInput,
  customProgramMethodologies,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '~/domains/program/lib/custom-templates'
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
import type { ProgramTemplateSummary } from '~/shared/types'

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
        index === sessionIndex
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
        index === sessionIndex
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

  const canCreate =
    draft.name.trim().length >= 3 &&
    draft.sessions.length === draft.daysPerWeek &&
    (draft.methodology !== 'none' || draft.sessions.every((session) => session.loggerExercises.length > 0))

  return (
    <Card className="max-h-[92vh] overflow-hidden" p={0}>
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Heading id={titleId} order={2} size="h3" className="truncate">
                Create programme
              </Heading>
              <Badge color="action">Custom</Badge>
            </div>
            <Text mt={4} size="sm" tone="dimmed">
              Build a constrained template from supported methodology presets.
            </Text>
          </div>
          <Button color="neutral" variant="subtle" onClick={onClose} disabled={mutation.isPending}>
            Close
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((item, index) => (
            <Button
              key={item.id}
              variant={step === item.id ? 'filled' : 'default'}
              disabled={mutation.isPending}
              onClick={() => setStep(item.id)}
            >
              {index + 1}. {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-h-[58vh] overflow-y-auto p-4">
        {step === 'methodology' ? (
          <CustomMethodologyStep
            draft={draft}
            onDraftChange={updateDraft}
            onMethodologyChange={setMethodology}
            onDaysChange={setDaysPerWeek}
          />
        ) : step === 'main_lifts' && draft.methodology === 'none' ? (
          <CustomLoggerExercisesStep
            draft={draft}
            onSessionChange={updateSession}
            onExerciseChange={updateLoggerExercise}
            onAddExercise={addLoggerExercise}
            onRemoveExercise={removeLoggerExercise}
          />
        ) : step === 'main_lifts' ? (
          <CustomMovementsStep draft={draft} onSessionChange={updateSession} />
        ) : step === 'accessories' && draft.methodology !== 'none' ? (
          <CustomAccessoriesStep
            draft={draft}
            onAccessoryChange={updateAccessory}
            onAddAccessory={addAccessory}
            onRemoveAccessory={removeAccessory}
          />
        ) : (
          <CustomReviewStep draft={draft} />
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="default" disabled={mutation.isPending || currentStepIndex === 0} onClick={() => moveStep(-1)}>
            <ChevronLeft size={14} />
            Back
          </Button>
          <div className="flex gap-2 sm:justify-end">
            {!isReview ? (
              <Button className="flex-1 sm:flex-none" disabled={mutation.isPending} onClick={() => moveStep(1)}>
                Next
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button className="flex-1 sm:flex-none" disabled={mutation.isPending || !canCreate} onClick={() => mutation.mutate()}>
                <Check size={16} />
                Create programme
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function CustomMethodologyStep({
  draft,
  onDraftChange,
  onMethodologyChange,
  onDaysChange,
}: {
  draft: CustomProgramBuilderInput
  onDraftChange: (patch: Partial<CustomProgramBuilderInput>) => void
  onMethodologyChange: (methodology: CustomProgramMethodology) => void
  onDaysChange: (daysPerWeek: number) => void
}) {
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
          value={draft.goal ?? ''}
          onChange={(event) => onDraftChange({ goal: event.target.value })}
        />
        <NumberInput
          label="Days per week"
          min={1}
          max={7}
          allowDecimal={false}
          clampBehavior="strict"
          value={draft.daysPerWeek}
          onChange={(value) => onDaysChange(clampBuilderDayCount(value, draft.daysPerWeek))}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(Object.keys(customProgramMethodologies) as CustomProgramMethodology[]).map((methodology) => {
          const option = customProgramMethodologies[methodology]
          const selected = draft.methodology === methodology
          return (
            <button
              key={methodology}
              className="min-h-[8rem] rounded-lg border p-4 text-left transition"
              style={{
                borderColor: selected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
                backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--vf-surface-2)',
              }}
              onClick={() => onMethodologyChange(methodology)}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <Text component="span" display="block" size="sm" fw={800}>{option.label}</Text>
                  <Text component="span" display="block" mt={4} size="xs" tone="dimmed">
                    {option.description}
                  </Text>
                  <span
                    className="mt-3 block rounded-md border px-2.5 py-2"
                    style={{
                      borderColor: 'var(--mantine-color-default-border)',
                      backgroundColor: 'var(--mantine-color-default)',
                    }}
                  >
                    <Caption fw={600}>{option.regulationSummary}</Caption>
                  </span>
                </span>
                <Tooltip label={option.tooltip} multiline w={260}>
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Info size={15} />
                  </span>
                </Tooltip>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CustomMovementsStep({
  draft,
  onSessionChange,
}: {
  draft: CustomProgramBuilderInput
  onSessionChange: (sessionIndex: number, patch: Partial<CustomProgramBuilderInput['sessions'][number]>) => void
}) {
  const supportsVariation = draft.methodology === 'plus_set_wave'
  return (
    <div className="grid gap-3">
      <Panel surface="inset" p="sm">
        <SectionLabel>Regulated structure</SectionLabel>
        <Caption mt={4}>{customProgramMethodologies[draft.methodology].regulationSummary}</Caption>
      </Panel>
      {draft.sessions.map((session, index) => (
        <Panel key={index} surface="inset" p="sm">
          <Text mb="sm" size="sm" fw={800}>{customBuilderDayTitle(index, session.mainMovementId)}</Text>
          <div className="grid gap-3 md:grid-cols-2">
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
            ) : (
              <Panel surface="panel" p="sm">
                <SectionLabel>Main prescription</SectionLabel>
                <Text mt={4} size="sm" fw={800}>{mainWorkSummary(draft.methodology, session)}</Text>
              </Panel>
            )}
          </div>
        </Panel>
      ))}
    </div>
  )
}

function CustomLoggerExercisesStep({
  draft,
  onSessionChange,
  onExerciseChange,
  onAddExercise,
  onRemoveExercise,
}: {
  draft: CustomProgramBuilderInput
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
        <SectionLabel>Logger-only exercises</SectionLabel>
        <Caption mt={4}>
          Add the exercises you want to repeat each day. Loads stay user-selected while logging and no progression rules are created.
        </Caption>
      </Panel>

      {draft.sessions.map((session, sessionIndex) => (
        <Panel key={sessionIndex} surface="inset" p="sm">
          <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <TextInput
              label={`Day ${sessionIndex + 1} title`}
              value={session.title}
              onChange={(event) => onSessionChange(sessionIndex, { title: event.target.value })}
            />
            <Button variant="default" onClick={() => onAddExercise(sessionIndex)}>
              <Plus size={14} />
              Add exercise
            </Button>
          </div>

          <div className="grid gap-2">
            {session.loggerExercises.map((exercise, exerciseIndex) => (
              <Panel
                key={exerciseIndex}
                surface="panel"
                p="sm"
                className="grid gap-2 lg:grid-cols-[minmax(10rem,1fr)_5rem_5rem_5rem_5rem_auto] lg:items-end"
              >
                <BuilderSelect
                  label="Exercise"
                  value={exercise.movementId}
                  onChange={(value) => {
                    if (!value) return
                    onExerciseChange(sessionIndex, exerciseIndex, { movementId: value })
                  }}
                  options={loggerMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
                />
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
                <Button
                  color="danger"
                  variant="light"
                  disabled={session.loggerExercises.length <= 1}
                  onClick={() => onRemoveExercise(sessionIndex, exerciseIndex)}
                >
                  <Trash2 size={14} />
                </Button>
              </Panel>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  )
}

function CustomAccessoriesStep({
  draft,
  onAccessoryChange,
  onAddAccessory,
  onRemoveAccessory,
}: {
  draft: CustomProgramBuilderInput
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
      {draft.sessions.map((session, sessionIndex) => (
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
            <Button variant="default" onClick={() => onAddAccessory(sessionIndex)}>
              <Plus size={14} />
              Add
            </Button>
          </div>
          <div className="mt-3 grid gap-2">
            {session.accessories.map((accessory, accessoryIndex) => (
              <Panel
                key={accessoryIndex}
                surface="panel"
                p="sm"
                className="grid gap-2 lg:grid-cols-[minmax(10rem,1fr)_5rem_5rem_5rem_auto] lg:items-end"
              >
                <BuilderSelect
                  label="Movement"
                  value={accessory.movementId}
                  onChange={(value) => {
                    if (!value) return
                    onAccessoryChange(sessionIndex, accessoryIndex, { movementId: value })
                  }}
                  options={accessoryMovementOptions.map((movement) => ({ value: movement.id, label: movement.name }))}
                />
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
                <Button color="danger" variant="light" onClick={() => onRemoveAccessory(sessionIndex, accessoryIndex)}>
                  <Trash2 size={14} />
                </Button>
              </Panel>
            ))}
            {!session.accessories.length ? (
              <Panel surface="panel" p="sm">
                <Text size="sm" tone="dimmed">No accessories planned.</Text>
              </Panel>
            ) : null}
          </div>
        </Panel>
      ))}
    </div>
  )
}

function CustomReviewStep({ draft }: { draft: CustomProgramBuilderInput }) {
  const methodology = customProgramMethodologies[draft.methodology]
  const accessoryCount = draft.sessions.reduce((total, session) => total + session.accessories.length, 0)
  const loggerExerciseCount = draft.sessions.reduce((total, session) => total + session.loggerExercises.length, 0)
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <ReviewMetric label="Method" value={methodology.shortLabel} />
        <ReviewMetric label="Schedule" value={`${draft.daysPerWeek} days/wk`} />
        <ReviewMetric label="Sessions" value={draft.sessions.length} />
        <ReviewMetric label={draft.methodology === 'none' ? 'Exercises' : 'Accessories'} value={draft.methodology === 'none' ? loggerExerciseCount : accessoryCount} />
      </div>
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
