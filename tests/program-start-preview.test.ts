import { describe, expect, it } from 'vitest'
import { defaultMovementReplacementRules, movementCatalog } from '../src/domains/movement/lib/movements'
import { buildProgramStartPreview } from '../src/domains/program/lib/program-start-preview'
import { getFallbackTemplateDefinition } from '../src/domains/program/lib/template-definitions'

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
})
