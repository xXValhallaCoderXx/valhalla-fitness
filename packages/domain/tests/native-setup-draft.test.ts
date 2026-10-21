import { describe, expect, it } from 'vitest'
import { buildProgramSetupSuggestions } from '../src/program/setup-suggestions'
import { canChangeSetupUnits, changeSetupUnits, changeSetupVariant, createNativeSetupDraft, editSetupValue,
  refreshSetupSuggestions, setupDraftStateValues, updateSetupSettings, useSetupSuggestion } from '../src/program/native-setup-draft'

function snapshot(templateId = 'first', estimate = 100) {
  return buildProgramSetupSuggestions({ templateId, units: 'kg', rounding: 2.5,
    requiredState: [
      { key: 'squat_training_max', movementId: 'squat', type: 'training_max' },
      { key: 'bench_press_working_load', movementId: 'bench_press', type: 'working_load' },
      { key: 'manual', movementId: 'deadlift', type: 'manual' },
    ], defaults: { squat_one_rep_max: estimate, bench_press_one_rep_max: 100, manual: 57.25 }, sessions: [] })
}
const draft = () => createNativeSetupDraft('account-1', 'draft-1', snapshot())

describe('retained native setup draft', () => {
  it('keeps raw manual inputs through percentage, rounding and refreshed suggestions', () => {
    let value = editSetupValue(draft(), 'squat_training_max', '83.')
    value = updateSetupSettings(value, { trainingMaxPercent: 95, workingLoadPercent: 80, rounding: 5 })
    expect(value.rawValues).toEqual({ squat_training_max: '83.', bench_press_working_load: '80', manual: '57.25' })
    value = refreshSetupSuggestions(value, snapshot('first', 120))
    expect(value.rawValues.squat_training_max).toBe('83.')
    expect(value.rawValues.manual).toBe('57.25')
    expect(value.manualKeys).toContain('squat_training_max')
    const accepted = useSetupSuggestion(value, 'squat_training_max')
    expect(accepted.rawValues.squat_training_max).toBe('115')
    expect(accepted.manualKeys).not.toContain('squat_training_max')
  })

  it.each(['', '.', '-1', 'abc'])('blocks changing units for unfinished explicit input %j', raw => {
    const value = editSetupValue(draft(), 'squat_training_max', raw)
    expect(canChangeSetupUnits(value)).toBe(false)
    expect(changeSetupUnits(value, 'lb')).toBe(value)
    expect(setupDraftStateValues(value)[0].value).toBeNull()
  })

  it('converts manual values and uses the target-unit step without relabelling numbers', () => {
    const value = changeSetupUnits(editSetupValue(draft(), 'squat_training_max', '100'), 'lb')
    expect(value.units).toBe('lb')
    expect(value.rounding).toBe(5)
    expect(value.rawValues.squat_training_max).toBe('220')
    expect(value.rawValues.bench_press_working_load).toBe('165')
    expect(setupDraftStateValues(value).every(row => row.unit === 'lb')).toBe(true)
    expect(value.manualKeys).toContain('squat_training_max')
  })

  it('does not overwrite a snapshot with another template and keeps account identity', () => {
    const value = editSetupValue(draft(), 'squat_training_max', '101')
    expect(refreshSetupSuggestions(value, snapshot('other'))).toBe(value)
    expect(value.accountId).toBe('account-1')
  })

  it('refreshes suggestions in the selected units without relabelling the incoming profile snapshot', () => {
    let value = changeSetupUnits(draft(), 'lb')
    value = editSetupValue(value, 'bench_press_working_load', '177.25')
    value = refreshSetupSuggestions(value, snapshot('first', 120))
    expect(value.units).toBe('lb')
    expect(value.snapshot.units).toBe('kg')
    expect(value.rawValues.squat_training_max).toBe('240')
    expect(value.rawValues.bench_press_working_load).toBe('177.25')
  })

  it('invalidates edits, equipment and review across variants while retaining global settings and monotonically increasing revision', () => {
    let value = editSetupValue(draft(), 'squat_training_max', '101')
    value = updateSetupSettings(value, { trainingMaxPercent: 95, workingLoadPercent: 80, rounding: 5 })
    value = updateSetupSettings(value, { rounding: 1 })
    value.customizations.equipmentMode = 'free_weight'
    const previous = value.revision
    const changed = changeSetupVariant(value, snapshot('second', 120))
    expect(changed).toMatchObject({ templateId: 'second', accountId: 'account-1', draftId: 'draft-1', units: 'kg',
      rounding: 1, trainingMaxPercent: 95, workingLoadPercent: 80, step: 'schedule', review: null, submission: null })
    expect(changed.revision).toBe(previous + 1)
    expect(changed.rawValues.squat_training_max).toBe('114')
    expect(changed.manualKeys).toEqual([])
    expect(changed.customizations.equipmentMode).toBe('standard')
    expect(changeSetupVariant(changed, snapshot()).revision).toBe(previous + 2)
  })
})
