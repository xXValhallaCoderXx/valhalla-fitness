import type { Movement } from '@sheetless/domain/movement/types'
import {
  isFreeWeightMovement,
  movementCatalog,
} from '@sheetless/domain/movement/movements'
import type {
  EquipmentModeAdaptation,
  FreeWeightChoiceDraft,
  FreeWeightPolicyVersion,
  ProgramEquipmentModeChoice,
  ProgramEquipmentModePreview,
  ProgramInstance,
  ProgramMovementOverride,
  ProgramSetupOptions,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
} from '@sheetless/domain/program/types'
import type { MovementSlot, SetLog } from '@sheetless/domain/session/types'
import type { MovementRole } from '@sheetless/domain/shared/types'
import { programAccessoryAdditionSlotId } from './program-accessory-slots'

export function isFreeWeightCompatibleMovement(
  movementId: string,
  catalog: Record<string, Movement> = movementCatalog,
) {
  return isFreeWeightMovement(catalog[movementId])
}

export function freeWeightChoiceKey(
  choice: Pick<
    FreeWeightChoiceDraft,
    'templateSessionId' | 'slotId' | 'phaseKey' | 'role'
  >,
) {
  return [
    choice.templateSessionId,
    choice.slotId,
    choice.phaseKey,
    choice.role,
  ].join(':')
}

export function normalizeFreeWeightChoices(
  choices: FreeWeightChoiceDraft[],
) {
  return [...choices].sort((left, right) =>
    freeWeightChoiceKey(left).localeCompare(freeWeightChoiceKey(right)),
  )
}

export function resolveProgramMovementOverride(
  overrides: ProgramMovementOverride[],
  {
    slotId,
    phaseKey,
    role,
    movementId,
    currentWeekIndex,
  }: {
    slotId: string
    phaseKey: string
    role: MovementRole
    movementId: string
    currentWeekIndex: number
  },
) {
  const match = overrides
    .map((override, index) => ({ override, index }))
    .filter(
      ({ override }) =>
        override.slotId === slotId &&
        (override.phaseKey === phaseKey || override.phaseKey === '*') &&
        override.role === role &&
        override.effectiveFromWeekIndex <= currentWeekIndex,
    )
    .sort((left, right) => {
      const phaseSpecificity =
        Number(right.override.phaseKey === phaseKey) -
        Number(left.override.phaseKey === phaseKey)
      if (phaseSpecificity) return phaseSpecificity
      const effectiveOrder =
        right.override.effectiveFromWeekIndex -
        left.override.effectiveFromWeekIndex
      if (effectiveOrder) return effectiveOrder
      return right.index - left.index
    })[0]?.override

  return match?.replacementMovementId ?? movementId
}

export function findFreeWeightPolicyRule(
  policy: FreeWeightPolicyVersion,
  sourceMovementId: string,
) {
  return policy.rules.find(
    (rule) => rule.sourceMovementId === sourceMovementId,
  )
}

export function defaultFreeWeightChoice({
  policy,
  templateSessionId,
  slotId,
  phaseKey,
  role,
  sourceMovementId,
  catalog = movementCatalog,
}: {
  policy: FreeWeightPolicyVersion
  templateSessionId: string
  slotId: string
  phaseKey: string
  role: MovementRole
  sourceMovementId: string
  catalog?: Record<string, Movement>
}): FreeWeightChoiceDraft | null {
  const rule = findFreeWeightPolicyRule(policy, sourceMovementId)
  const replacementMovementId = rule?.replacementMovementIds.find(
    (movementId) =>
      isFreeWeightCompatibleMovement(movementId, catalog),
  )
  if (!rule || !replacementMovementId) return null
  return {
    templateSessionId,
    slotId,
    phaseKey,
    role,
    sourceMovementId,
    replacementMovementId,
    policyRuleId: rule.id,
  }
}

export function resolveEquipmentModeMovement({
  program,
  templateSessionId,
  slotId,
  phaseKey,
  role,
  sourceMovementId,
  catalog = movementCatalog,
}: {
  program: Pick<
    ProgramInstance,
    'equipmentMode' | 'equipmentModeChoices'
  >
  templateSessionId: string
  slotId: string
  phaseKey: string
  role: MovementRole
  sourceMovementId: string
  catalog?: Record<string, Movement>
}): {
  movementId: string
  adaptation?: EquipmentModeAdaptation
} {
  if (program.equipmentMode !== 'free_weight') {
    return { movementId: sourceMovementId }
  }
  if (isFreeWeightCompatibleMovement(sourceMovementId, catalog)) {
    return { movementId: sourceMovementId }
  }

  const choice = (program.equipmentModeChoices ?? []).find(
    (candidate) =>
      candidate.templateSessionId === templateSessionId &&
      candidate.slotId === slotId &&
      candidate.phaseKey === phaseKey &&
      candidate.role === role &&
      candidate.sourceMovementId === sourceMovementId,
  )
  if (
    !choice ||
    !isFreeWeightCompatibleMovement(choice.replacementMovementId, catalog)
  ) {
    throw new Error('FREE_WEIGHT_CHOICE_STALE')
  }

  return {
    movementId: choice.replacementMovementId,
    adaptation: {
      mode: 'free_weight',
      sourceMovementId,
      policyRuleId: choice.policyRuleId,
      loadReset: true,
    },
  }
}

export function clearModeAdaptedLoads(sets: SetLog[]): SetLog[] {
  return sets.map((set) => ({
    ...set,
    targetLoad: null,
    actualLoad: null,
  }))
}

export function applyEquipmentModeToSlot(
  slot: MovementSlot,
  adaptation?: EquipmentModeAdaptation,
): MovementSlot {
  if (!adaptation) return slot
  return {
    ...slot,
    modeAdaptation: adaptation,
    sets: clearModeAdaptedLoads(slot.sets),
  }
}

export function choiceMatchesPolicy(
  choice: ProgramEquipmentModeChoice,
  policy: FreeWeightPolicyVersion,
) {
  const rule = policy.rules.find((candidate) => candidate.id === choice.policyRuleId)
  return Boolean(
    rule &&
      rule.sourceMovementId === choice.sourceMovementId &&
      rule.replacementMovementIds.includes(choice.replacementMovementId),
  )
}

export function buildSetupFreeWeightPreview({
  setupOptions,
  movementOverrides,
  accessoryAdditions,
  policy = setupOptions.freeWeightPolicy,
  catalog = movementCatalog,
}: {
  setupOptions: ProgramSetupOptions
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: ProgramStartAccessoryAdditionInput[]
  policy?: FreeWeightPolicyVersion | null
  catalog?: Record<string, Movement>
}) {
  const choices = new Map<string, FreeWeightChoiceDraft>()
  const changes = new Map<
    string,
    {
      choice: FreeWeightChoiceDraft
      sessionTitle: string
      phaseLabel: string
      sourceMovementName: string
      replacementMovementName: string
      alternatives: Array<{ movementId: string; movementName: string; policyRuleId: string }>
    }
  >()
  const unresolved = new Map<
    string,
    {
      templateSessionId: string
      slotId: string
      phaseKey: string
      sourceMovementId: string
      sourceMovementName: string
    }
  >()

  if (!policy) {
    return {
      choices: [],
      changes: [],
      unresolved: [],
      canApply: false,
    }
  }

  const uniquePhases = new Map<string, string>()
  for (const week of setupOptions.previewWeeks) {
    if (!uniquePhases.has(week.phaseKey)) {
      uniquePhases.set(week.phaseKey, week.phaseLabel)
    }
    for (const session of week.sessions) {
      for (const movement of session.movements) {
        const override = movementOverrides.find(
          (candidate) =>
            candidate.slotId === movement.slotId &&
            candidate.phaseKey === movement.setupPhaseKey &&
            candidate.role === movement.role,
        )
        const sourceMovementId =
          override?.replacementMovementId ?? movement.defaultMovementId
        if (isFreeWeightCompatibleMovement(sourceMovementId, catalog)) continue
        const choice = defaultFreeWeightChoice({
          policy,
          templateSessionId: session.id,
          slotId: movement.slotId,
          phaseKey: week.phaseKey,
          role: movement.role,
          sourceMovementId,
          catalog,
        })
        const key = [
          session.id,
          movement.slotId,
          week.phaseKey,
          movement.role,
        ].join(':')
        if (!choice) {
          unresolved.set(key, {
            templateSessionId: session.id,
            slotId: movement.slotId,
            phaseKey: week.phaseKey,
            sourceMovementId,
            sourceMovementName:
              catalog[sourceMovementId]?.name ?? sourceMovementId,
          })
          continue
        }
        const rule = findFreeWeightPolicyRule(policy, sourceMovementId)!
        choices.set(key, choice)
        changes.set(key, {
          choice,
          sessionTitle: session.title,
          phaseLabel: week.phaseLabel,
          sourceMovementName:
            catalog[sourceMovementId]?.name ?? sourceMovementId,
          replacementMovementName:
            catalog[choice.replacementMovementId]?.name ??
            choice.replacementMovementId,
          alternatives: rule.replacementMovementIds
            .filter((movementId) =>
              isFreeWeightCompatibleMovement(movementId, catalog),
            )
            .map((movementId) => ({
              movementId,
              movementName: catalog[movementId]?.name ?? movementId,
              policyRuleId: rule.id,
            })),
        })
      }
    }
  }

  const additionsBySession = new Map<string, number>()
  for (const addition of accessoryAdditions) {
    const index = (additionsBySession.get(addition.sessionId) ?? 0) + 1
    additionsBySession.set(addition.sessionId, index)
    if (isFreeWeightCompatibleMovement(addition.movementId, catalog)) continue
    const slotId = programAccessoryAdditionSlotId(
      addition.sessionId,
      index,
      addition.movementId,
    )
    const setupSession = setupOptions.sessions.find(
      (session) => session.id === addition.sessionId,
    )
    for (const [phaseKey, phaseLabel] of uniquePhases) {
      if (addition.phaseKey && addition.phaseKey !== '*' && addition.phaseKey !== phaseKey) {
        continue
      }
      const choice = defaultFreeWeightChoice({
        policy,
        templateSessionId: addition.sessionId,
        slotId,
        phaseKey,
        role: 'accessory',
        sourceMovementId: addition.movementId,
        catalog,
      })
      const key = `${addition.sessionId}:${slotId}:${phaseKey}:accessory`
      if (!choice) {
        unresolved.set(key, {
          templateSessionId: addition.sessionId,
          slotId,
          phaseKey,
          sourceMovementId: addition.movementId,
          sourceMovementName:
            catalog[addition.movementId]?.name ?? addition.movementId,
        })
        continue
      }
      const rule = findFreeWeightPolicyRule(policy, addition.movementId)!
      choices.set(key, choice)
      changes.set(key, {
        choice,
        sessionTitle: setupSession?.title ?? addition.sessionId,
        phaseLabel,
        sourceMovementName:
          catalog[addition.movementId]?.name ?? addition.movementId,
        replacementMovementName:
          catalog[choice.replacementMovementId]?.name ??
          choice.replacementMovementId,
        alternatives: rule.replacementMovementIds
          .filter((movementId) =>
            isFreeWeightCompatibleMovement(movementId, catalog),
          )
          .map((movementId) => ({
            movementId,
            movementName: catalog[movementId]?.name ?? movementId,
            policyRuleId: rule.id,
          })),
      })
    }
  }

  return {
    choices: normalizeFreeWeightChoices(Array.from(choices.values())),
    changes: Array.from(changes.values()),
    unresolved: Array.from(unresolved.values()),
    canApply: unresolved.size === 0,
  }
}

function resolveTemplateMovement(
  movementId: string | { default: string; byPhase?: Record<string, string> },
  phaseKey: string,
) {
  if (typeof movementId === 'string') return movementId
  return movementId.byPhase?.[phaseKey] ?? movementId.default
}

function resolveProgramOverride(
  program: ProgramInstance,
  input: {
    slotId: string
    phaseKey: string
    role: MovementRole
    movementId: string
  },
) {
  return resolveProgramMovementOverride(program.movementOverrides ?? [], {
    ...input,
    // A mode choice is durable for the whole slot + phase, not one week.
    // Preview the eventual override so a live phase-slot edit that becomes
    // effective next session cannot strand a future expansion without a
    // matching free-weight choice.
    currentWeekIndex: Number.MAX_SAFE_INTEGER,
  })
}

export function buildActiveProgramEquipmentModePreview({
  program,
  targetMode,
  policy,
  catalog = movementCatalog,
}: {
  program: ProgramInstance
  targetMode: ProgramInstance['equipmentMode']
  policy: FreeWeightPolicyVersion | null
  catalog?: Record<string, Movement>
}): ProgramEquipmentModePreview {
  const definition = program.templateDefinition
  if (!definition) throw new Error('PINNED_TEMPLATE_INVALID')
  const phases = new Map(
    definition.weeks.map((week) => [
      week.phaseKey,
      { phaseKey: week.phaseKey, phaseLabel: week.phaseLabel },
    ]),
  )
  const changes: ProgramEquipmentModePreview['changes'] = []
  const unresolved: ProgramEquipmentModePreview['unresolved'] = []
  const seen = new Set<string>()

  const visit = ({
    templateSessionId,
    sessionTitle,
    slotId,
    phaseKey,
    phaseLabel,
    role,
    sourceMovementId,
  }: {
    templateSessionId: string
    sessionTitle: string
    slotId: string
    phaseKey: string
    phaseLabel: string
    role: MovementRole
    sourceMovementId: string
  }) => {
    if (isFreeWeightCompatibleMovement(sourceMovementId, catalog)) return
    const key = freeWeightChoiceKey({
      templateSessionId,
      slotId,
      phaseKey,
      role,
    })
    if (seen.has(key)) return
    seen.add(key)
    if (!policy) {
      unresolved.push({
        templateSessionId,
        slotId,
        phaseKey,
        sourceMovementId,
        sourceMovementName: catalog[sourceMovementId]?.name ?? sourceMovementId,
      })
      return
    }
    const rule = findFreeWeightPolicyRule(policy, sourceMovementId)
    const ruleAlternatives =
      rule?.replacementMovementIds.filter((movementId) =>
        isFreeWeightCompatibleMovement(movementId, catalog),
      ) ?? []
    const saved = (program.equipmentModeChoices ?? []).find(
      (choice) =>
        freeWeightChoiceKey(choice) === key &&
        choice.sourceMovementId === sourceMovementId &&
        choiceMatchesPolicy(choice, policy) &&
        ruleAlternatives.includes(choice.replacementMovementId),
    )
    const stale = (program.equipmentModeChoices ?? []).some(
      (choice) =>
        freeWeightChoiceKey(choice) === key &&
        (choice.sourceMovementId !== sourceMovementId ||
          !choiceMatchesPolicy(choice, policy) ||
          !ruleAlternatives.includes(choice.replacementMovementId)),
    )
    const replacementMovementId =
      saved?.replacementMovementId ?? ruleAlternatives[0]
    if (!rule || !replacementMovementId) {
      unresolved.push({
        templateSessionId,
        slotId,
        phaseKey,
        sourceMovementId,
        sourceMovementName: catalog[sourceMovementId]?.name ?? sourceMovementId,
      })
      return
    }
    changes.push({
      templateSessionId,
      slotId,
      phaseKey,
      role,
      sourceMovementId,
      replacementMovementId,
      policyRuleId: rule.id,
      sessionTitle,
      phaseLabel,
      sourceMovementName: catalog[sourceMovementId]?.name ?? sourceMovementId,
      replacementMovementName:
        catalog[replacementMovementId]?.name ?? replacementMovementId,
      alternatives: ruleAlternatives
        .map((movementId) => ({
          movementId,
          movementName: catalog[movementId]?.name ?? movementId,
          policyRuleId: rule.id,
        })),
      selectionState: saved ? 'saved' : stale ? 'stale' : 'defaulted',
    })
  }

  for (const phase of phases.values()) {
    for (const session of definition.sessions) {
      for (const slot of session.slots) {
        const slotId = `slot-${session.id}-${slot.id}`
        const templateMovementId = resolveTemplateMovement(
          slot.movementId,
          phase.phaseKey,
        )
        visit({
          templateSessionId: session.id,
          sessionTitle: session.title,
          slotId,
          phaseKey: phase.phaseKey,
          phaseLabel: phase.phaseLabel,
          role: slot.role,
          sourceMovementId: resolveProgramOverride(program, {
            slotId,
            phaseKey: phase.phaseKey,
            role: slot.role,
            movementId: templateMovementId,
          }),
        })
      }
      for (const addition of program.accessoryAdditions ?? []) {
        if (
          addition.sessionId !== session.id ||
          (addition.phaseKey !== '*' &&
            addition.phaseKey !== phase.phaseKey)
        ) {
          continue
        }
        visit({
          templateSessionId: session.id,
          sessionTitle: session.title,
          slotId: `slot-${session.id}-${addition.slotId}`,
          phaseKey: phase.phaseKey,
          phaseLabel: phase.phaseLabel,
          role: 'accessory',
          sourceMovementId: addition.movementId,
        })
      }
    }
  }

  return {
    programId: program.id,
    currentMode: program.equipmentMode ?? 'standard',
    targetMode: targetMode ?? 'standard',
    expectedStateVersion: program.stateVersion,
    policy,
    changes,
    unresolved,
    canApply:
      targetMode === 'standard' ||
      (Boolean(policy) && unresolved.length === 0),
  }
}
