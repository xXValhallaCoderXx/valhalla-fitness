import { describe, expect, it } from 'vitest'
import { resolveTemplateTargetLoad, type TemplateLoadContext } from '../src/program/template-load'
import { buildProgramStartPreview } from '../src/program/program-start-preview'
import { getFallbackTemplateDefinition } from '../src/program/template-definitions'
import { movementCatalog } from '../src/movement/movements'

const context: TemplateLoadContext = {
  movementId: 'front_squat', anchorMovementId: 'squat', rounding: 2.5, units: 'kg',
  stateValues: [
    { key: 'squat_training_max', movementId: 'squat', type: 'training_max', value: 100 },
    { key: 'shared_anchor', movementId: 'squat', type: 'working_load', value: 80 },
  ],
}

describe('shared programme and unsaved-preview load calculation', () => {
  it('resolves anchor lifts and explicit state keys with the prescribed range choice', () => {
    expect(resolveTemplateTargetLoad({ kind: 'percent_of_state', stateType: 'training_max',
      percent: 0.65, percentMax: 0.85, default: 'high' }, context)).toBe(85)
    expect(resolveTemplateTargetLoad({ kind: 'percent_of_state', stateType: 'working_load',
      stateKey: 'shared_anchor', percent: 0.72, default: 'low' }, context)).toBe(57.5)
    expect(resolveTemplateTargetLoad({ kind: 'state', stateType: 'working_load', stateKey: 'shared_anchor' }, context)).toBe(80)
  })

  it('preserves fixed zero and unit conversion without inventing missing or self-selected loads', () => {
    expect(resolveTemplateTargetLoad({ kind: 'fixed', kg: 0 }, context)).toBe(0)
    expect(resolveTemplateTargetLoad({ kind: 'fixed', kg: 40 }, { ...context, units: 'lb' })).toBe(90)
    expect(resolveTemplateTargetLoad({ kind: 'fixed', kg: 40, lb: 85 }, { ...context, units: 'lb' })).toBe(85)
    expect(resolveTemplateTargetLoad({ kind: 'user_selected' }, context)).toBeNull()
    expect(resolveTemplateTargetLoad({ kind: 'percent_of_state', stateType: 'training_max',
      percent: 0.75, default: 'blank' }, context)).toBeNull()
    expect(resolveTemplateTargetLoad(undefined, context)).toBeNull()
  })

  it('keeps missing state strict for workouts and explicitly unavailable for preview', () => {
    const load = { kind: 'state', stateType: 'working_load' } as const
    expect(() => resolveTemplateTargetLoad(load, context)).toThrow('front_squat_working_load')
    expect(resolveTemplateTargetLoad(load, context, 'unavailable')).toBeNull()
  })

  it('retains each author-defined anchor in the read-only setup model', () => {
    const definition = structuredClone(getFallbackTemplateDefinition('healthy-531-fsl'))
    definition.sessions[0].slots[0].anchorMovementId = 'deadlift'
    const preview = buildProgramStartPreview({ templateId: definition.id, definition, catalog: movementCatalog, rules: [] })
    expect(preview[0].sessions[0].movements[0].anchorMovementId).toBe('deadlift')
    const ordinary = preview[0].sessions[0].movements[1]
    expect(ordinary.anchorMovementId).toBe(ordinary.defaultMovementId)
  })
})
