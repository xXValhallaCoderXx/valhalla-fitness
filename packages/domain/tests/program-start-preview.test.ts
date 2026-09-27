import { describe, expect, it } from 'vitest'
import {
  defaultMovementReplacementRules,
  freeWeightPolicyV1,
  movementCatalog,
} from '@sheetless/domain/movement/movements'
import { buildProgramSetupOptions } from '@sheetless/domain/program/program-setup-options'
import { buildProgramStartPreview } from '@sheetless/domain/program/program-start-preview'
import { getFallbackTemplateDefinition } from '@sheetless/domain/program/template-definitions'
import { templateCatalog } from '@sheetless/domain/program/templates'

describe('program start preview', () => {
  it('shows beginner 5x5 weekly sessions with suggested accessories', () => {
    const preview = buildProgramStartPreview({
      templateId: 'generic_alternating_5x5_lp',
      definition: getFallbackTemplateDefinition('generic_alternating_5x5_lp'),
      catalog: movementCatalog,
      rules: defaultMovementReplacementRules,
    })

    expect(preview).toHaveLength(2)
    expect(preview[0]?.sessions.map((session) => session.movementSummary)).toEqual([
      'Squat, Bench Press, Barbell Row, Chin-Up, Back Extension',
      'Squat, Overhead Press, Deadlift, Lat Pulldown, Sit-Up',
      'Squat, Bench Press, Barbell Row, Pull-Up, Cable Crunch',
    ])
    expect(preview[1]?.sessions.map((session) => session.movementSummary)).toEqual([
      'Squat, Overhead Press, Deadlift, Chin-Up, Back Extension',
      'Squat, Bench Press, Barbell Row, Lat Pulldown, Sit-Up',
      'Squat, Overhead Press, Deadlift, Pull-Up, Cable Crunch',
    ])
  })

  it('uses setup-compatible phase keys for inline accessory swaps', () => {
    const preview = buildProgramStartPreview({
      templateId: 'generic_alternating_5x5_lp',
      definition: getFallbackTemplateDefinition('generic_alternating_5x5_lp'),
      catalog: movementCatalog,
      rules: defaultMovementReplacementRules,
    })

    const dayOneAccessory = preview[0]?.sessions[0]?.movements.find(
      (movement) => movement.defaultMovementId === 'chin_up',
    )

    expect(dayOneAccessory).toMatchObject({
      slotId: 'slot-day-1-accessory-1',
      templateSlotId: 'accessory-1',
      phaseKey: 'starts_with_a',
      setupPhaseKey: '*',
      roleLabel: 'Accessory 1',
      targetSummary: '3 sets x 6-10 reps @ RIR 2',
    })
    expect(dayOneAccessory?.replacementOptions.map((option) => option.movementId)).toContain('lat_pulldown')
  })

  it('includes required equipment in setup accessory and replacement options', () => {
    const templateId = 'generic_alternating_5x5_lp'
    const template = templateCatalog.find((item) => item.id === templateId)
    if (!template) throw new Error('Missing test template')

    const setup = buildProgramSetupOptions({
      template,
      definition: getFallbackTemplateDefinition(templateId),
      catalog: movementCatalog,
      rules: defaultMovementReplacementRules,
      freeWeightPolicy: freeWeightPolicyV1,
    })
    const latPulldown = setup.accessoryCatalog.find(
      (item) => item.movementId === 'lat_pulldown',
    )
    const replacement = setup.sessions
      .flatMap((session) => session.slots)
      .flatMap((slot) => slot.replacementOptions)
      .find((item) => item.movementId === 'lat_pulldown')

    expect(latPulldown?.requiredEquipment).toEqual(['cable', 'machine'])
    expect(replacement?.requiredEquipment).toEqual(['cable', 'machine'])
  })

  it('exposes exact unsaved prescriptions including percentages, effort and back-off flags', () => {
    const definition = getFallbackTemplateDefinition('healthy-531-fsl')
    const preview = buildProgramStartPreview({
      templateId: definition.id, definition, catalog: movementCatalog, rules: [],
    })
    const slot = definition.sessions[0].slots[0]
    const prescribed = definition.weeks[0].prescriptions[slot.prescriptionId].sets
    const movement = preview[0].sessions[0].movements[0]
    expect(movement.sets).toEqual(prescribed)
    expect(movement.sets).not.toBe(prescribed)
    expect(movement.sets?.[0].targetLoad).not.toBe(prescribed[0].targetLoad)
    expect(movement.sets?.some((set) => set.isAmrap)).toBe(true)
    expect(movement.sets?.some((set) => set.isBackoff)).toBe(true)
    expect(movement.requiredEquipment).toEqual(movementCatalog[movement.defaultMovementId].requiredEquipment)
  })

  it('resolves equipment with each phase movement and leaves unknown equipment unavailable', () => {
    const definition = getFallbackTemplateDefinition('generic_alternating_5x5_lp')
    const preview = buildProgramStartPreview({
      templateId: definition.id, definition, catalog: movementCatalog, rules: [],
    })
    expect(preview[0].sessions[0].movements[1].defaultMovementId).toBe('bench_press')
    expect(preview[1].sessions[0].movements[1].defaultMovementId).toBe('overhead_press')
    for (const week of preview) {
      for (const session of week.sessions) {
        for (const movement of session.movements) {
          expect(movement.requiredEquipment).toEqual(movementCatalog[movement.defaultMovementId].requiredEquipment)
        }
      }
    }
    const missing = buildProgramStartPreview({ templateId: definition.id, definition, catalog: {}, rules: [] })
    expect(missing[0].sessions[0].movements[0].requiredEquipment).toBeUndefined()
  })
})
