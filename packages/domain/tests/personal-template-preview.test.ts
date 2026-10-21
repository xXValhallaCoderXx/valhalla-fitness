import { describe, expect, it } from 'vitest'
import { personalTemplatePreviewLines } from '../src/program/personal-template-preview'
import type { ProgramSetupPreviewMovement, ProgramStateInput } from '../src/program/types'

const movement: ProgramSetupPreviewMovement = {
  slotId: 'variation', templateSlotId: 'variation', phaseKey: 'base', phaseLabel: 'Base', setupPhaseKey: 'base',
  role: 'variation', roleLabel: 'Variation', defaultMovementId: 'front_squat', defaultMovementName: 'Front squat',
  anchorMovementId: 'squat', targetSummary: 'Work', replacementOptions: [],
}
const input = { units: 'kg' as const, rounding: 2.5, stateValues: [
  { key: 'squat_training_max', movementId: 'squat', type: 'training_max', value: 100 },
] as ProgramStateInput[] }
const percentage = { targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent: 0.7, default: 'low' }, targetReps: 5, targetRir: 2 } as const

describe('personal unsaved template preview', () => {
  it('uses the author anchor and groups equal sets while retaining distinct work kinds and efforts', () => {
    const lines = personalTemplatePreviewLines({ ...movement, sets: [percentage, percentage,
      { ...percentage, isTopSet: true, isAmrap: true }, { ...percentage, isBackoff: true, targetRir: 0 }] }, input)
    expect(lines.map(line => [line.count, line.load, line.reps, line.kind, line.effort])).toEqual([
      [2, 70, '5', '', 'RIR 2'], [1, 70, '5+', 'Top set', 'RIR 2'], [1, 70, '5', 'Back-off', 'RIR 0'],
    ])
  })

  it('never substitutes zeros or a movement-derived guess for an unknown percentage anchor', () => {
    expect(personalTemplatePreviewLines({ ...movement, anchorMovementId: undefined, sets: [percentage] }, input)[0])
      .toMatchObject({ load: null, loadLabel: 'Starting weight unavailable' })
    expect(personalTemplatePreviewLines({ ...movement, sets: [percentage] }, { ...input, stateValues: [] })[0])
      .toMatchObject({ load: null, loadLabel: 'Starting weight unavailable' })
  })

  it('keeps genuine zero, self-selected and missing prescriptions distinct', () => {
    const lines = personalTemplatePreviewLines({ ...movement, sets: [
      { targetLoad: { kind: 'fixed', kg: 0 }, targetReps: 5 },
      { targetLoad: { kind: 'user_selected' }, targetRepMin: 8, targetRepMax: 12 },
      { targetReps: 10 },
    ] }, input)
    expect(lines.map(line => [line.load, line.loadLabel])).toEqual([[0, null], [null, 'Choose your load'], [null, 'Load not specified']])
  })
})
