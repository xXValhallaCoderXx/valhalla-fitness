import { Badge, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Check, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Caption, ConfirmDialog, Page, PageHeader, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import {
  DEFAULT_TRAINING_MAX_PERCENT,
  DEFAULT_WORKING_LOAD_PERCENT,
  suggestedLoadFromOneRepMax,
} from '~/domains/program/lib/program-loads'
import { shouldConfirmProgramStart } from '~/domains/program/lib/program-switch'
import {
  accessoryDraftClientId,
  compactWeekPreviewOptions,
  defaultsSummary,
  hasUsableStateValue,
  isSetupConfigurableRole,
  missingRequiredLoadMessage,
  stateValuesForProfileTemplate,
  type AccessoryAdditionDraft,
} from '~/domains/program/lib/template-start-utils'
import { startProgramFn } from '~/domains/program/server/program-functions'
import type {
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  ProgramStateInput,
  ProgramTemplateSummary,
  TodayPayload,
  UserProfile,
} from '~/shared/types'
import { StartInfoMetric } from './TemplateStartMetric'
import { ProgrammeInfoModal } from './TemplateStartInfoModal'
import { TemplateStartPreview } from './TemplateStartPreview'
import { DefaultsModal, SetupValuesButton, StartSummaryPanel } from './TemplateStartValues'

export function TemplateStartContent({
  template,
  me,
  today,
  setupOptions,
}: {
  template: ProgramTemplateSummary
  me: UserProfile
  today: TodayPayload
  setupOptions: ProgramSetupOptions
}) {
  const router = useRouter()
  const [activeWeekIndex, setActiveWeekIndex] = useState(0)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [showDefaultsModal, setShowDefaultsModal] = useState(false)
  const [showProgrammeInfo, setShowProgrammeInfo] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [movementOverrides, setMovementOverrides] = useState<ProgramStartMovementOverrideInput[]>([])
  const [accessoryAdditions, setAccessoryAdditions] = useState<AccessoryAdditionDraft[]>([])
  const [trainingMaxPercent, setTrainingMaxPercent] = useState(DEFAULT_TRAINING_MAX_PERCENT)
  const [workingLoadPercent, setWorkingLoadPercent] = useState(DEFAULT_WORKING_LOAD_PERCENT)
  const [stateValues, setStateValues] = useState<ProgramStateInput[]>(() =>
    stateValuesForProfileTemplate(template, me, DEFAULT_TRAINING_MAX_PERCENT, DEFAULT_WORKING_LOAD_PERCENT),
  )
  const activeSessionId = today.activeSession?.sessionId
  const weekOptions = useMemo(() => compactWeekPreviewOptions(setupOptions.previewWeeks), [setupOptions.previewWeeks])
  const activeWeekOption = weekOptions.find((option) => option.week.index === activeWeekIndex) ?? weekOptions[0]
  const activeWeek = activeWeekOption?.week ?? setupOptions.previewWeeks[0]
  const customizationCount = movementOverrides.length + accessoryAdditions.length

  const visibleState = useMemo(
    () =>
      template.requiredState.length
        ? template.requiredState
            .map((required) => stateValues.find((state) => state.key === required.key))
            .filter(Boolean) as ProgramStateInput[]
        : [],
    [stateValues, template.requiredState],
  )
  const missingRequiredState = useMemo(
    () => visibleState.filter((state) => !hasUsableStateValue(state.value)),
    [visibleState],
  )
  const hasTrainingMaxState = visibleState.some((state) => state.type === 'training_max')
  const hasWorkingLoadState = visibleState.some((state) => state.type === 'working_load')

  const updateStateValue = (key: string, value: number | null) => {
    setStateValues((current) =>
      current.map((state) =>
        state.key === key
          ? {
              ...state,
              value,
            }
          : state,
      ),
    )
  }

  const updateDerivedStatePercent = (stateType: 'training_max' | 'working_load', percent: number) => {
    if (stateType === 'training_max') setTrainingMaxPercent(percent)
    if (stateType === 'working_load') setWorkingLoadPercent(percent)
    setStateValues((current) => {
      if (!current.some((state) => state.type === stateType)) return current
      return current.map((state) => {
        if (state.type !== stateType) return state
        const suggested = suggestedLoadFromOneRepMax(me.programStateDefaults, state.movementId, percent, me.rounding)
        return {
          ...state,
          value: suggested ?? state.value,
        }
      })
    })
  }

  const startMutation = useMutation({
    mutationFn: (input: { replaceActiveProgram?: boolean }) => {
      const startStateValues = template.requiredState.length
        ? stateValues.filter((state) => template.requiredState.some((required) => required.key === state.key))
        : []

      return startProgramFn({
        data: {
          templateId: template.id,
          stateValues: startStateValues,
          movementOverrides: movementOverrides.length ? movementOverrides : undefined,
          accessoryAdditions: accessoryAdditions.length
            ? accessoryAdditions.map((addition) => ({
                sessionId: addition.sessionId,
                sourceSlotId: addition.sourceSlotId,
                movementId: addition.movementId,
                phaseKey: addition.phaseKey,
              }))
            : undefined,
          replaceActiveProgram: input.replaceActiveProgram,
        },
      })
    },
    onMutate: () => {
      setStartError(null)
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Active program in progress') {
        setShowSwitchConfirm(true)
        return
      }
      const message = getApiErrorMessage(error, 'Unable to start programme')
      setStartError(message)
      notifications.show({ color: 'danger', title: 'Could not start programme', message })
    },
    onSuccess: async () => {
      notifications.show({ color: 'success', title: 'Programme started', message: 'Your next workout is ready.' })
      setShowSwitchConfirm(false)
      const queryClient = router.options.context.queryClient
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
      ]
      if (activeSessionId) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['session', activeSessionId] }))
      }
      await Promise.all(invalidations)
      await router.invalidate()
      await router.navigate({ to: '/today' })
    },
  })

  const handleMovementOverrideChange = (movement: ProgramSetupPreviewMovement, replacementMovementId: string) => {
    if (!isSetupConfigurableRole(movement.role)) return
    const role = movement.role
    setMovementOverrides((current) => {
      const withoutSlot = current.filter(
        (override) =>
          !(override.slotId === movement.slotId && override.phaseKey === movement.setupPhaseKey && override.role === role),
      )
      if (replacementMovementId === movement.defaultMovementId) return withoutSlot
      return [
        ...withoutSlot,
        {
          slotId: movement.slotId,
          phaseKey: movement.setupPhaseKey,
          role,
          originalMovementId: movement.defaultMovementId,
          replacementMovementId,
        },
      ]
    })
  }

  const handleAddAccessory = (addition: ProgramStartAccessoryAdditionInput) => {
    setAccessoryAdditions((current) => [
      ...current,
      {
        ...addition,
        clientId: accessoryDraftClientId(addition),
      },
    ])
  }

  const handleRemoveAccessory = (clientId: string) => {
    setAccessoryAdditions((current) => current.filter((addition) => addition.clientId !== clientId))
  }

  const requestStartProgram = () => {
    setStartError(null)
    if (missingRequiredState.length) {
      setStartError(missingRequiredLoadMessage(missingRequiredState))
      return
    }
    if (shouldConfirmProgramStart(today)) {
      setShowSwitchConfirm(true)
      return
    }
    startMutation.mutate({})
  }

  const confirmSwitch = () => {
    setStartError(null)
    if (missingRequiredState.length) {
      setStartError(missingRequiredLoadMessage(missingRequiredState))
      setShowSwitchConfirm(false)
      return
    }
    startMutation.mutate({ replaceActiveProgram: true })
  }

  return (
    <Page className="max-w-[1200px] pb-44 md:px-8 lg:px-10 lg:pb-8">
      <Link
        to="/templates"
        className="mb-3 inline-flex items-center gap-1.5 transition"
        style={{
          color: 'var(--mantine-color-dimmed)',
          fontSize: 'var(--mantine-font-size-xs)',
          fontWeight: 700,
        }}
      >
        <ArrowLeft size={14} />
        Templates
      </Link>

      <PageHeader
        eyebrow="Start programme"
        title={template.name}
        actions={
          <>
            <Button variant="default" onClick={() => setShowProgrammeInfo(true)}>
              <Info size={14} />
              How it works
            </Button>
            <Badge color={template.origin === 'licensed_partner' ? 'warning' : 'action'}>{template.sourceLabel}</Badge>
            <Badge color="neutral">{template.daysPerWeek} days/wk</Badge>
          </>
        }
      >
        {template.description}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <StartInfoMetric label="Schedule" value={`${template.daysPerWeek} days/wk`} />
            <StartInfoMetric label="Progression" value={template.progressionLabel} />
            <StartInfoMetric label="Complexity" value={template.complexity} />
          </div>

          <TemplateStartPreview
            activeWeek={activeWeek}
            activeWeekOption={activeWeekOption}
            weekOptions={weekOptions}
            units={me.units}
            setupOptions={setupOptions}
            movementOverrides={movementOverrides}
            accessoryAdditions={accessoryAdditions}
            onWeekChange={setActiveWeekIndex}
            onMovementOverrideChange={handleMovementOverrideChange}
            onAddAccessory={handleAddAccessory}
            onRemoveAccessory={handleRemoveAccessory}
          />
        </div>

        <StartSummaryPanel
          className="hidden lg:sticky lg:top-16 lg:block"
          units={me.units}
          rounding={me.rounding}
          visibleState={visibleState}
          missingRequiredState={missingRequiredState}
          hasTrainingMaxState={hasTrainingMaxState}
          hasWorkingLoadState={hasWorkingLoadState}
          customizationCount={customizationCount}
          hasActiveProgram={Boolean(today.activeProgram)}
          startError={startError}
          isPending={startMutation.isPending}
          onStart={requestStartProgram}
          onViewDefaults={() => setShowDefaultsModal(true)}
        />
      </div>

      <div
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t p-3 backdrop-blur lg:hidden"
        style={{
          borderColor: 'var(--mantine-color-default-border)',
          backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 96%, transparent)',
          boxShadow: '0 -12px 36px rgb(0 0 0 / 0.12)',
        }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2">
          {startError ? (
            <Text
              size="xs"
              style={{
                border: '1px solid var(--vf-danger-border)',
                backgroundColor: 'var(--vf-danger-soft)',
                color: 'var(--vf-danger-text)',
                borderRadius: 'var(--mantine-radius-md)',
                padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
              }}
            >
              {startError}
            </Text>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Text size="xs" fw={800} truncate>{template.name}</Text>
              <Caption truncate>
                {defaultsSummary(me.units, me.rounding, visibleState)}
              </Caption>
            </div>
            <div className="flex shrink-0 gap-2">
              <SetupValuesButton
                disabled={missingRequiredState.length > 0}
                label="Values"
                onClick={() => setShowDefaultsModal(true)}
              />
              <Button disabled={startMutation.isPending || missingRequiredState.length > 0} onClick={requestStartProgram}>
                <Check size={16} />
                Start
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DefaultsModal
        opened={showDefaultsModal}
        units={me.units}
        rounding={me.rounding}
        profileDefaults={me.programStateDefaults}
        visibleState={visibleState}
        missingRequiredState={missingRequiredState}
        trainingMaxPercent={trainingMaxPercent}
        workingLoadPercent={workingLoadPercent}
        hasTrainingMaxState={hasTrainingMaxState}
        hasWorkingLoadState={hasWorkingLoadState}
        onTrainingMaxPercentChange={(percent) => updateDerivedStatePercent('training_max', percent)}
        onWorkingLoadPercentChange={(percent) => updateDerivedStatePercent('working_load', percent)}
        onStateValueChange={updateStateValue}
        onClose={() => setShowDefaultsModal(false)}
      />
      <ProgrammeInfoModal
        opened={showProgrammeInfo}
        template={template}
        setupOptions={setupOptions}
        weekOptions={weekOptions}
        onClose={() => setShowProgrammeInfo(false)}
      />

      <ConfirmDialog
        open={showSwitchConfirm}
        title="Replace active programme?"
        confirmLabel="Replace programme"
        confirmVariant="danger"
        tone="danger"
        isPending={startMutation.isPending}
        onCancel={() => setShowSwitchConfirm(false)}
        onConfirm={confirmSwitch}
      >
        <div className="space-y-2">
          <Text>
            You already have{' '}
            <Text component="span" fw={600}>
              {today.activeProgram?.title ?? 'an active programme'}
            </Text>{' '}
            active.
          </Text>
          <Text>
            Starting <Text component="span" fw={600}>{template.name}</Text> will archive the current programme and make
            this your new active programme.
          </Text>
          {today.activeSession ? (
            <Text>Your workout in progress will be marked as abandoned. Saved lifts will be retained.</Text>
          ) : null}
        </div>
      </ConfirmDialog>
    </Page>
  )
}
