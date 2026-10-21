import { describe, expect, it } from 'vitest'
import { previewCompactPrescription, previewEquipment, previewPrescriptionLines,
  previewPrescriptionText, previewProgressionNotes } from '../src/program/template-preview-presentation'
import type { ProgramSetupPreviewMovement, ProgramSetupPreviewWeek, TemplateSetDefinition } from '../src/program/types'

function movement(values: Partial<ProgramSetupPreviewMovement> = {}): ProgramSetupPreviewMovement {
  return { slotId: 'squat', templateSlotId: 'main', phaseKey: 'base', phaseLabel: 'Base', setupPhaseKey: 'base',
    role: 'main', roleLabel: 'Main', defaultMovementId: 'squat', defaultMovementName: 'Squat',
    targetSummary: 'Summary from the template', replacementOptions: [], ...values }
}
function week(movements: ProgramSetupPreviewMovement[]): ProgramSetupPreviewWeek {
  return { index: 0, label: 'Week 1', phaseKey: 'base', phaseLabel: 'Base', subtitle: 'Base',
    summary: 'Base', hardness: 'Medium', sessions: [{ id: 'day-a', label: 'Day 1', title: 'Squat',
      estimatedMinutes: 45, movementSummary: 'Squat', keyPrescription: 'Working sets', movements }] }
}

describe('generic programme prescription presentation', () => {
  it('preserves percent ranges, actual reference types, rep ranges and effort without personal loads', () => {
    const sets: TemplateSetDefinition[] = [{ targetLoad: { kind: 'percent_of_state', stateType: 'training_max',
      percent: 0.65, percentMax: 0.75, default: 'blank' }, targetRepMin: 5, targetRepMax: 8, targetRir: 2 }]
    expect(previewPrescriptionText(previewPrescriptionLines(sets)[0]!)).toBe('1 × 5–8 · 65–75% of training max · RIR 2')
    expect(previewPrescriptionLines([{ ...sets[0], targetLoad: { kind: 'state', stateType: 'working_load' } }])[0]?.load).toBe('working load')
    expect(previewPrescriptionLines([{ targetLoad: { kind: 'percent_of_state', stateType: 'one_rep_max',
      percent: 80, default: 'low' } }])[0]?.load).toBe('80% of one-rep max')
  })

  it('groups matching consecutive sets without merging top sets or back-off work', () => {
    const set: TemplateSetDefinition = { targetReps: 5, targetRir: 0, targetLoad: { kind: 'user_selected' } }
    const lines = previewPrescriptionLines([set, set, { ...set, isTopSet: true, isAmrap: true },
      { ...set, isBackoff: true }, { ...set, isBackoff: true }])
    expect(lines.map((line) => [line.count, line.reps, line.kind])).toEqual([[2, '5', ''], [1, '5+', 'Top set'], [2, '5', 'Back-off']])
    expect(lines[0]?.effort).toBe('RIR 0')
    expect(lines[0]?.load).toBe('Choose the load')
  })

  it('does not turn missing prescriptions or missing loads into bodyweight or guessed targets', () => {
    expect(previewPrescriptionLines(undefined)).toEqual([])
    expect(previewPrescriptionLines([])).toEqual([])
    expect(previewPrescriptionText(previewPrescriptionLines([{}])[0]!)).toBe('1 × Reps not specified · Load not specified')
    expect(previewPrescriptionLines([{ targetLoad: { kind: 'fixed', kg: 25 } }])[0]?.load).toBe('Prescribed 25 kg')
  })

  it('compacts percentage sequences while retaining per-set effort differences', () => {
    const sets: TemplateSetDefinition[] = [0.65, 0.75, 0.85].map((value, index) => ({
      targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent: value, default: 'low' },
      targetReps: 5, ...(index === 2 ? { isAmrap: true, isTopSet: true, targetRir: 2 } : {}),
    }))
    expect(previewCompactPrescription(sets)).toEqual({ load: '65 · 75 · 85', reps: '5, 5, 5+',
      reference: '% of training max', effort: 'Set 3: RIR 2' })
    expect(previewCompactPrescription([{ ...sets[0], isBackoff: true }])).toBeNull()
    expect(previewCompactPrescription([sets[0]!, { ...sets[1], targetLoad: { kind: 'state', stateType: 'working_load' } }])).toBeNull()
    expect(previewCompactPrescription([sets[0]!, sets[1]!, sets[0]!])?.load).toBe('65 · 75 · 65')
  })

  it('collects all phases of equipment and reports incomplete cached responses honestly', () => {
    const base = week([movement({ requiredEquipment: ['barbell', 'rack'] })])
    const peak = week([movement({ defaultMovementId: 'dumbbell_squat', requiredEquipment: ['dumbbells', 'bench'] })])
    expect(previewEquipment([base, peak])).toEqual({ labels: ['Barbell', 'Rack', 'Dumbbells', 'Bench'], complete: true })
    expect(previewEquipment([base, week([movement()])])).toEqual({ labels: ['Barbell', 'Rack'], complete: false })
    expect(previewEquipment([]).complete).toBe(false)
  })

  it('explains evaluator-supported rules only for the roles where they actually run', () => {
    const notes = previewProgressionNotes([week([
      movement({ progressionRuleId: 'training_max_band' }),
      movement({ role: 'accessory', progressionRuleId: 'accessory_double_progression' }),
      movement({ role: 'variation', progressionRuleId: 'simple_linear_completion' }),
    ])])
    expect(notes).toHaveLength(2)
    expect(notes.join(' ')).toContain('reps you had left')
    expect(notes.join(' ')).not.toMatch(/2\.5|5 kg|reset|working load/)
    expect(previewProgressionNotes([week([movement({ progressionRuleId: 'unknown_rule' })])])).toEqual([])
  })
})
