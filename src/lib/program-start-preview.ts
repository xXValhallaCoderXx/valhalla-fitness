import type {
  Movement,
  MovementReplacementRule,
  MovementRole,
  ProgramSetupPreviewWeek,
} from '~/types/training'
import { buildMovementSwapOptions, getMovementName } from './movements'
import type { TemplateDefinition } from './template-engine'

type TemplateSlot = TemplateDefinition['sessions'][number]['slots'][number]

function resolveTemplateMovementId(
  movementId: TemplateSlot['movementId'],
  phaseKey: string,
) {
  if (typeof movementId === 'string') return movementId
  return movementId.byPhase?.[phaseKey] ?? movementId.default
}

function uniqueTemplatePhases(definition: TemplateDefinition) {
  const phases = new Map<string, string>()
  for (const week of definition.weeks) {
    if (!phases.has(week.phaseKey)) phases.set(week.phaseKey, week.phaseLabel)
  }
  return Array.from(phases.entries()).map(([phaseKey, phaseLabel]) => ({ phaseKey, phaseLabel }))
}

function setupPhaseKeyForSlot(definition: TemplateDefinition, slot: TemplateSlot, phaseKey: string) {
  if (slot.role !== 'accessory') return phaseKey
  const phaseMovementIds = new Set(
    uniqueTemplatePhases(definition).map((phase) => resolveTemplateMovementId(slot.movementId, phase.phaseKey)),
  )
  return phaseMovementIds.size === 1 ? '*' : phaseKey
}

function countSlotRoles(slots: TemplateDefinition['sessions'][number]['slots']) {
  const counts = new Map<MovementRole, number>()
  for (const slot of slots) counts.set(slot.role, (counts.get(slot.role) ?? 0) + 1)
  return counts
}

function previewRoleLabel(role: MovementRole, roleCount: number, roleIndex: number) {
  const label = role.replaceAll('_', ' ')
  const title = label.charAt(0).toUpperCase() + label.slice(1)
  return roleCount > 1 ? `${title} ${roleIndex}` : title
}

export function buildProgramStartPreview({
  templateId,
  definition,
  catalog,
  rules,
}: {
  templateId: string
  definition: TemplateDefinition
  catalog: Record<string, Movement>
  rules: MovementReplacementRule[]
}): ProgramSetupPreviewWeek[] {
  return definition.weeks.map((week, weekIndex) => ({
    index: weekIndex,
    label: week.label,
    phaseKey: week.phaseKey,
    phaseLabel: week.phaseLabel,
    subtitle: week.waveLabel ? `${week.phaseLabel} - ${week.waveLabel}` : week.phaseLabel,
    summary: week.summary,
    hardness: week.hardness,
    sessions: definition.sessions.map((session, sessionIndex) => {
      const roleCounts = countSlotRoles(session.slots)
      const roleIndexes = new Map<MovementRole, number>()
      const movements = session.slots.map((slot) => {
        const roleIndex = (roleIndexes.get(slot.role) ?? 0) + 1
        roleIndexes.set(slot.role, roleIndex)
        const prescription = week.prescriptions[slot.prescriptionId]
        const movementId = resolveTemplateMovementId(slot.movementId, week.phaseKey)
        const slotId = `slot-${session.id}-${slot.id}`
        const setupPhaseKey = setupPhaseKeyForSlot(definition, slot, week.phaseKey)
        const replacementOptions =
          slot.role === 'variation' || slot.role === 'accessory'
            ? buildMovementSwapOptions({
                movementId,
                role: slot.role,
                templateId,
                phaseKey: setupPhaseKey === '*' ? null : setupPhaseKey,
                slotId,
                catalog,
                rules,
              }).filter((option) => option.allowedScopes.includes('phase_slot'))
            : []

        return {
          slotId,
          templateSlotId: slot.id,
          phaseKey: week.phaseKey,
          phaseLabel: week.phaseLabel,
          setupPhaseKey,
          role: slot.role,
          roleLabel: previewRoleLabel(slot.role, roleCounts.get(slot.role) ?? 1, roleIndex),
          defaultMovementId: movementId,
          defaultMovementName: getMovementName(movementId),
          targetSummary: slot.targetSummary ?? prescription?.targetSummary ?? 'No prescription',
          progressionRuleId: prescription?.progressionRuleId ?? null,
          replacementOptions,
        }
      })

      return {
        id: session.id,
        label: `Day ${sessionIndex + 1}`,
        title: session.title,
        estimatedMinutes: session.estimatedMinutes,
        movementSummary: movements.map((movement) => movement.defaultMovementName).join(', ') || 'No movements',
        keyPrescription: movements.find((movement) => movement.role === 'main')?.targetSummary ?? movements[0]?.targetSummary ?? 'No prescription',
        movements,
      }
    }),
  }))
}
