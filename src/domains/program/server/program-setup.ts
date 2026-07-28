import type { Movement, MovementReplacementRule } from '~/domains/movement'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '~/domains/program'
import type { TemplateDefinition } from '~/domains/program/lib/template-engine'
import { buildProgramStartPreview } from '~/domains/program/lib/program-start-preview'
import { buildMovementSwapOptions, getMovementName } from '~/domains/movement/lib/movements'

function resolveTemplateMovementId(
  movementId: TemplateDefinition['sessions'][number]['slots'][number]['movementId'],
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
  return Array.from(phases.entries()).map(([phaseKey, phaseLabel]) => ({
    phaseKey,
    phaseLabel,
  }))
}

function firstWeekForPhase(definition: TemplateDefinition, phaseKey: string) {
  return (
    definition.weeks.find((week) => week.phaseKey === phaseKey) ??
    definition.weeks[0]
  )
}

function sourceLabelForAccessoryPrescription(
  movementId: string,
  targetSummary: string,
) {
  return `${getMovementName(movementId)} plan · ${targetSummary}`
}

export function buildProgramSetupOptions({
  template,
  definition,
  catalog,
  rules,
}: {
  template: ProgramTemplateSummary
  definition: TemplateDefinition
  catalog: Record<string, Movement>
  rules: MovementReplacementRule[]
}): ProgramSetupOptions {
  const phases = uniqueTemplatePhases(definition)
  const accessoryCatalog = Object.values(catalog)
    .filter((movement) => !movement.isCompetition)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((movement) => ({
      movementId: movement.id,
      movementName: movement.name,
      category: movement.category,
      equipment: movement.equipment,
    }))

  return {
    templateId: template.id,
    templateName: template.name,
    origin: template.origin,
    previewWeeks: buildProgramStartPreview({
      templateId: template.id,
      definition,
      catalog,
      rules,
    }),
    accessoryCatalog,
    sessions: definition.sessions.map((session) => {
      const accessoryPrescriptions = session.slots
        .filter((slot) => slot.role === 'accessory')
        .map((slot) => {
          const phase = phases[0]
          const week = firstWeekForPhase(
            definition,
            phase?.phaseKey ?? definition.weeks[0]?.phaseKey ?? 'cycle',
          )
          const movementId = resolveTemplateMovementId(slot.movementId, week.phaseKey)
          const prescription = week.prescriptions[slot.prescriptionId]
          return {
            sourceSlotId: slot.id,
            label: sourceLabelForAccessoryPrescription(
              movementId,
              prescription?.targetSummary ?? 'Accessory work',
            ),
            prescriptionId: slot.prescriptionId,
            targetSummary: prescription?.targetSummary ?? 'Accessory work',
          }
        })

      const slots = session.slots.flatMap((slot) => {
        if (slot.role !== 'variation' && slot.role !== 'accessory') return []
        const slotId = `slot-${session.id}-${slot.id}`
        const phaseRows = phases.map((phase) => {
          const week = firstWeekForPhase(definition, phase.phaseKey)
          const movementId = resolveTemplateMovementId(
            slot.movementId,
            phase.phaseKey,
          )
          const prescription = week.prescriptions[slot.prescriptionId]
          return {
            phaseKey: phase.phaseKey,
            phaseLabel: phase.phaseLabel,
            movementId,
            targetSummary:
              prescription?.targetSummary ??
              slot.targetSummary ??
              'Planned work',
          }
        })
        const uniqueMovementIds = new Set(
          phaseRows.map((phase) => phase.movementId),
        )
        const rows =
          slot.role === 'accessory' && uniqueMovementIds.size === 1
            ? [
                {
                  phaseKey: '*',
                  phaseLabel: 'All phases',
                  movementId:
                    phaseRows[0]?.movementId ??
                    resolveTemplateMovementId(
                      slot.movementId,
                      phases[0]?.phaseKey ?? 'cycle',
                    ),
                  targetSummary:
                    phaseRows[0]?.targetSummary ??
                    slot.targetSummary ??
                    'Accessory work',
                },
              ]
            : phaseRows

        return rows.map((row) => ({
          sessionId: session.id,
          sessionTitle: session.title,
          slotId,
          templateSlotId: slot.id,
          phaseKey: row.phaseKey,
          phaseLabel: row.phaseLabel,
          role: slot.role as 'variation' | 'accessory',
          defaultMovementId: row.movementId,
          defaultMovementName: getMovementName(row.movementId),
          prescriptionId: slot.prescriptionId,
          targetSummary: row.targetSummary,
          replacementOptions: buildMovementSwapOptions({
            movementId: row.movementId,
            role: slot.role,
            templateId: template.id,
            phaseKey: row.phaseKey === '*' ? null : row.phaseKey,
            slotId,
            catalog,
            rules,
          }).filter((option) => option.allowedScopes.includes('phase_slot')),
        }))
      })

      return {
        id: session.id,
        title: session.title,
        slots,
        accessoryPrescriptions,
      }
    }),
  }
}
