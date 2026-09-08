import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import {
  DEFAULT_TRAINING_MAX_PERCENT,
  DEFAULT_WORKING_LOAD_PERCENT,
} from '~/domains/program/lib/program-loads'
import {
  buildSetupLiftRows,
  convertSetupStateValues,
  roundingForUnit,
  setupOneRepMaxResolver,
} from '~/domains/program/lib/setup-lift-rows'
import {
  adjacentSetupStep,
  blockerForStep,
  setupStepBlockers,
  type SetupStepId,
} from '~/domains/program/lib/setup-steps'
import { mround } from '~/domains/program/lib/progression'
import { shouldConfirmProgramStart } from '~/domains/program/lib/program-switch'
import {
  changedSlotIds,
  deriveTemplatePhases,
  templateStructureMode,
} from '~/domains/program/lib/template-start-phases'
import { normalizeFreeWeightChoices } from '~/domains/program/lib/equipment-mode'
import {
  compactWeekPreviewOptions,
  hasUsableStateValue,
  missingRequiredLoadMessage,
  stateValuesForProfileTemplate,
} from '~/domains/program/lib/template-start-utils'
import { startProgramFn } from '~/domains/program/server/program-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { browserIanaTimeZone } from '~/shared/lib/calendar-date'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import type { UserProfile } from '~/domains/account'
import type {
  ProgramSetupOptions,
  ProgramStateInput,
  ProgramTemplateSummary,
} from '~/domains/program'
import type { LiftE1rmSeries } from '~/domains/history'
import type { Unit } from '~/shared/types'
import type { TodayPayload } from '~/domains/session'
import { useTemplateStartEquipmentMode } from './useTemplateStartEquipmentMode'

export function useTemplateStartController({
  template,
  me,
  today,
  setupOptions,
  liftSeries = null,
}: {
  template: ProgramTemplateSummary
  me: UserProfile
  today: TodayPayload
  setupOptions: ProgramSetupOptions
  /** Per-session e1RM history, so starting numbers come from logged sets rather than estimates. */
  liftSeries?: LiftE1rmSeries[] | null
}) {
  const userId = useRequiredAccountId()
  const router = useRouter()
  const [activeWeekIndex, setActiveWeekIndex] = useState(0)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [showProgrammeInfo, setShowProgrammeInfo] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const equipment = useTemplateStartEquipmentMode({ setupOptions })
  const {
    equipmentMode,
    freeWeightChoices,
    equipmentModeReviewNeeded,
    movementOverrides,
    accessoryAdditions,
    setShowEquipmentModePreview,
  } = equipment
  const [step, setStep] = useState<SetupStepId>('numbers')
  const [trainingMaxPercent, setTrainingMaxPercent] = useState(DEFAULT_TRAINING_MAX_PERCENT)
  const [workingLoadPercent, setWorkingLoadPercent] = useState(DEFAULT_WORKING_LOAD_PERCENT)
  // Rounding and units are programme-scoped here: `startProgramInputSchema` already accepts both,
  // and changing them must not write back to the profile.
  const [rounding, setRounding] = useState(me.rounding)
  const [units, setUnits] = useState<Unit>(me.units)
  const startRequestId = useRef<string | null>(null)
  const oneRepMaxFor = useMemo(
    () => setupOneRepMaxResolver({ liftSeries, defaults: me.programStateDefaults }),
    [liftSeries, me.programStateDefaults],
  )
  const [stateValues, setStateValues] = useState<ProgramStateInput[]>(() =>
    stateValuesForProfileTemplate(template, me, DEFAULT_TRAINING_MAX_PERCENT, DEFAULT_WORKING_LOAD_PERCENT, {
      oneRepMaxFor,
    }),
  )
  const activeSessionId = today.activeSession?.sessionId
  const weekOptions = useMemo(() => compactWeekPreviewOptions(setupOptions.previewWeeks), [setupOptions.previewWeeks])
  const activeWeekOption = weekOptions.find((option) => option.week.index === activeWeekIndex) ?? weekOptions[0]
  // Resolve the active week directly by index (not via the compacted layout groups) so phase tabs
  // can jump to any phase even when its movements match the previous phase.
  const activeWeek =
    setupOptions.previewWeeks.find((week) => week.index === activeWeekIndex) ?? setupOptions.previewWeeks[0]
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

  const rederive = (
    current: ProgramStateInput[],
    match: (state: ProgramStateInput) => boolean,
    percentFor: (state: ProgramStateInput) => number,
    nextRounding: number,
  ) =>
    current.map((state) => {
      if (!match(state)) return state
      const oneRepMax = oneRepMaxFor(state.movementId)
      if (oneRepMax === null) return state
      return { ...state, value: mround(oneRepMax * (percentFor(state) / 100), nextRounding) }
    })

  const updateDerivedStatePercent = (stateType: 'training_max' | 'working_load', percent: number) => {
    if (stateType === 'training_max') setTrainingMaxPercent(percent)
    if (stateType === 'working_load') setWorkingLoadPercent(percent)
    setStateValues((current) =>
      current.some((state) => state.type === stateType)
        ? rederive(current, (state) => state.type === stateType, () => percent, rounding)
        : current,
    )
  }

  /** Units convert the numbers and take that unit's plate step with them. */
  const updateUnits = (next: Unit) => {
    if (next === units) return
    const nextRounding = roundingForUnit(next)
    setStateValues((current) => convertSetupStateValues(current, units, next, nextRounding))
    setUnits(next)
    setRounding(nextRounding)
  }

  /** Re-rounding moves every derived value; a manual entry is left exactly as typed. */
  const updateRounding = (next: number) => {
    setRounding(next)
    setStateValues((current) =>
      rederive(
        current,
        (state) => state.type === 'training_max' || state.type === 'working_load',
        (state) => (state.type === 'training_max' ? trainingMaxPercent : workingLoadPercent),
        next,
      ),
    )
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
          units,
          rounding,
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
          equipmentMode,
          freeWeightPolicyVersionId:
            equipmentMode === 'free_weight'
              ? setupOptions.freeWeightPolicy?.id
              : undefined,
          freeWeightPolicyChecksum:
            equipmentMode === 'free_weight'
              ? setupOptions.freeWeightPolicy?.checksum
              : undefined,
          freeWeightChoices:
            equipmentMode === 'free_weight'
              ? normalizeFreeWeightChoices(freeWeightChoices)
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

  const requestStartProgram = () => {
    setStartError(null)
    if (missingRequiredState.length) {
      setStartError(missingRequiredLoadMessage(missingRequiredState))
      return
    }
    if (equipmentModeReviewNeeded) {
      setShowEquipmentModePreview(true)
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

  const blockers = setupStepBlockers({ missingRequiredState })
  const liftRows = useMemo(
    () =>
      buildSetupLiftRows({
        stateValues: visibleState,
        liftSeries,
        defaults: me.programStateDefaults,
        rounding,
        trainingMaxPercent,
        workingLoadPercent,
      }),
    [visibleState, liftSeries, me.programStateDefaults, rounding, trainingMaxPercent, workingLoadPercent],
  )

  /** Refuses to advance past a step that still has something to fix; going back is always allowed. */
  const goToStep = (direction: 'next' | 'previous') => {
    if (direction === 'next' && blockerForStep(blockers, step)) {
      setStartError(blockerForStep(blockers, step)?.message ?? null)
      return
    }
    const target = adjacentSetupStep(step, direction)
    if (!target) return
    setStartError(null)
    setStep(target)
  }

  return {
    step,
    setStep,
    goToStep,
    blockers,
    liftRows,
    rounding,
    units,
    updateRounding,
    updateUnits,
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
    ...equipment,
    trainingMaxPercent,
    workingLoadPercent,
    startError,
    isStarting: startMutation.isPending,
    showSwitchConfirm,
    showProgrammeInfo,
    setActiveWeekIndex,
    setShowSwitchConfirm,
    setShowProgrammeInfo,
    updateStateValue,
    updateDerivedStatePercent,
    requestStartProgram,
    confirmSwitch,
  }
}
