import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import {
  DEFAULT_TRAINING_MAX_PERCENT,
  DEFAULT_WORKING_LOAD_PERCENT,
  suggestedLoadFromOneRepMax,
} from '~/domains/program/lib/program-loads'
import { shouldConfirmProgramStart } from '~/domains/program/lib/program-switch'
import {
  changedSlotIds,
  deriveTemplatePhases,
  templateStructureMode,
} from '~/domains/program/lib/template-start-phases'
import {
  accessoryDraftClientId,
  compactWeekPreviewOptions,
  hasUsableStateValue,
  isSetupConfigurableRole,
  missingRequiredLoadMessage,
  stateValuesForProfileTemplate,
  type AccessoryAdditionDraft,
} from '~/domains/program/lib/template-start-utils'
import { startProgramFn } from '~/domains/program/server/program-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { browserIanaTimeZone } from '~/shared/lib/calendar-date'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import type { UserProfile } from '~/domains/account'
import type {
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  ProgramStateInput,
  ProgramTemplateSummary,
} from '~/domains/program'
import type { TodayPayload } from '~/domains/session'

export function useTemplateStartController({
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
  const userId = useRequiredAccountId()
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
  const startRequestId = useRef<string | null>(null)
  const [stateValues, setStateValues] = useState<ProgramStateInput[]>(() =>
    stateValuesForProfileTemplate(template, me, DEFAULT_TRAINING_MAX_PERCENT, DEFAULT_WORKING_LOAD_PERCENT),
  )
  const activeSessionId = today.activeSession?.sessionId
  const weekOptions = useMemo(() => compactWeekPreviewOptions(setupOptions.previewWeeks), [setupOptions.previewWeeks])
  const activeWeekOption = weekOptions.find((option) => option.week.index === activeWeekIndex) ?? weekOptions[0]
  // Resolve the active week directly by index (not via the compacted layout groups) so phase tabs
  // can jump to any phase even when its movements match the previous phase.
  const activeWeek =
    setupOptions.previewWeeks.find((week) => week.index === activeWeekIndex) ?? setupOptions.previewWeeks[0]
  const customizationCount = movementOverrides.length + accessoryAdditions.length
  const phases = useMemo(() => deriveTemplatePhases(setupOptions.previewWeeks), [setupOptions.previewWeeks])
  const mode = useMemo(() => templateStructureMode(setupOptions.previewWeeks), [setupOptions.previewWeeks])
  const activePhaseKey = activeWeek?.phaseKey ?? phases[0]?.phaseKey ?? ''
  const changedSlots = useMemo(() => {
    if (mode !== 'phased') return new Set<string>()
    const index = phases.findIndex((phase) => phase.phaseKey === activePhaseKey)
    if (index <= 0) return new Set<string>()
    return changedSlotIds(phases[index - 1]!, phases[index]!)
  }, [mode, phases, activePhaseKey])
  const quickFacts = [
    { label: 'Schedule', value: `${template.daysPerWeek} days/wk` },
    { label: 'Progression', value: template.progressionLabel },
    { label: 'Complexity', value: template.complexity },
    { label: 'Cycle', value: `${setupOptions.previewWeeks.length} weeks` },
    ...(phases.length > 1 ? [{ label: 'Phases', value: String(phases.length) }] : []),
  ]
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
      current.map((state) => (state.key === key ? { ...state, value } : state)),
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
        return { ...state, value: suggested ?? state.value }
      })
    })
  }

  const startMutation = useMutation({
    mutationFn: (input: { requestId: string; replaceActiveProgram?: boolean }) => {
      const startStateValues = template.requiredState.length
        ? stateValues.filter((state) => template.requiredState.some((required) => required.key === state.key))
        : []
      return startProgramFn({
        data: {
          requestId: input.requestId,
          templateId: template.id,
          timeZone: browserIanaTimeZone() ?? undefined,
          stateValues: startStateValues,
          movementOverrides: movementOverrides.length ? movementOverrides : undefined,
          accessoryAdditions: accessoryAdditions.length
            ? accessoryAdditions.map(({ sessionId, sourceSlotId, movementId, phaseKey }) => ({
                sessionId,
                sourceSlotId,
                movementId,
                phaseKey,
              }))
            : undefined,
          replaceActiveProgram: input.replaceActiveProgram,
        },
      })
    },
    onMutate: () => setStartError(null),
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
      startRequestId.current = null
      notifications.show({ color: 'success', title: 'Programme started', message: 'Your next workout is ready.' })
      setShowSwitchConfirm(false)
      const queryClient = router.options.context.queryClient
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(userId) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(userId) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(userId) }),
      ]
      if (activeSessionId) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: accountQueryKeys.session(userId, activeSessionId) }),
        )
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
    setAccessoryAdditions((current) => [...current, { ...addition, clientId: accessoryDraftClientId(addition) }])
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
    startRequestId.current ??= crypto.randomUUID()
    startMutation.mutate({ requestId: startRequestId.current })
  }

  const confirmSwitch = () => {
    setStartError(null)
    if (missingRequiredState.length) {
      setStartError(missingRequiredLoadMessage(missingRequiredState))
      setShowSwitchConfirm(false)
      return
    }
    startRequestId.current ??= crypto.randomUUID()
    startMutation.mutate({ requestId: startRequestId.current, replaceActiveProgram: true })
  }

  return {
    activeWeek,
    activeWeekOption,
    weekOptions,
    phases,
    mode,
    activePhaseKey,
    changedSlots,
    quickFacts,
    visibleState,
    missingRequiredState,
    hasTrainingMaxState,
    hasWorkingLoadState,
    customizationCount,
    movementOverrides,
    accessoryAdditions,
    trainingMaxPercent,
    workingLoadPercent,
    startError,
    isStarting: startMutation.isPending,
    showSwitchConfirm,
    showDefaultsModal,
    showProgrammeInfo,
    setActiveWeekIndex,
    setShowSwitchConfirm,
    setShowDefaultsModal,
    setShowProgrammeInfo,
    updateStateValue,
    updateDerivedStatePercent,
    handleMovementOverrideChange,
    handleAddAccessory,
    handleRemoveAccessory: (clientId: string) =>
      setAccessoryAdditions((current) => current.filter((addition) => addition.clientId !== clientId)),
    requestStartProgram,
    confirmSwitch,
  }
}
