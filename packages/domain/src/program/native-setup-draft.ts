import type { FreeWeightChoiceDraft, ProgramEquipmentMode, ProgramStartMovementOverrideInput } from './types'
import type { AccessoryAdditionDraft } from './template-start-utils'
import type { ProgramStartReceipt, ProgramStartReview, ReviewedProgramStartIntent } from './reviewed-start'
import { convertWeight, mround } from '../shared/math'
import type { Unit } from '../shared/types'
import { setupSuggestionValue, type ProgramSetupSuggestionSnapshot } from './setup-suggestions'

export const nativeSetupSteps = ['schedule', 'numbers', 'equipment', 'review'] as const
export type NativeSetupStep = typeof nativeSetupSteps[number]
export type SetupCustomizations = {
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
  equipmentMode: ProgramEquipmentMode
  choiceState: { choices: FreeWeightChoiceDraft[]; reviewedChoices: FreeWeightChoiceDraft[] }
  reviewOpen: boolean
}
export type NativeProgramSetupDraft = {
  accountId: string; draftId: string; templateId: string; step: NativeSetupStep
  snapshot: ProgramSetupSuggestionSnapshot
  units: Unit; rounding: number; trainingMaxPercent: number; workingLoadPercent: number
  rawValues: Record<string, string>; manualKeys: string[]; customizations: SetupCustomizations
  revision: number; review: ProgramStartReview | null
  submission: { requestId: string; intent: ReviewedProgramStartIntent } | null
  receipt: ProgramStartReceipt | null
}
export const blankSetupCustomizations = (): SetupCustomizations => ({
  movementOverrides: [], accessoryAdditions: [], equipmentMode: 'standard',
  choiceState: { choices: [], reviewedChoices: [] }, reviewOpen: false,
})

export function createNativeSetupDraft(accountId: string, draftId: string, snapshot: ProgramSetupSuggestionSnapshot): NativeProgramSetupDraft {
  return { accountId, draftId, templateId: snapshot.templateId, snapshot, step: 'schedule',
    units: snapshot.units, rounding: snapshot.rounding, trainingMaxPercent: snapshot.trainingMaxPercent,
    workingLoadPercent: snapshot.workingLoadPercent,
    rawValues: Object.fromEntries(snapshot.stateValues.map((state) => [state.key, state.value === null ? '' : String(state.value)])),
    manualKeys: [], customizations: blankSetupCustomizations(), revision: 0, review: null, submission: null, receipt: null }
}

export function positiveSetupInput(raw: string) {
  if (!raw.trim()) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function setupDraftStateValues(draft: NativeProgramSetupDraft) {
  return draft.snapshot.stateValues.map((state) => ({ ...state, unit: draft.units, value: positiveSetupInput(draft.rawValues[state.key] ?? '') }))
}

export function invalidateSetupReview(draft: NativeProgramSetupDraft): NativeProgramSetupDraft {
  return { ...draft, revision: draft.revision + 1, review: null, submission: null }
}

export function editSetupValue(draft: NativeProgramSetupDraft, key: string, value: string) {
  return invalidateSetupReview({ ...draft, rawValues: { ...draft.rawValues, [key]: value }, manualKeys: [...new Set([...draft.manualKeys, key])] })
}

export function suggestionForDraft(draft: NativeProgramSetupDraft, key: string) {
  const state = draft.snapshot.stateValues.find((row) => row.key === key)
  const row = draft.snapshot.sourceRows.find((row) => row.key === key)
  if (!state || !row) return null
  return setupSuggestionValue(state, { ...row, reference: row.reference === null ? null : convertWeight(row.reference, draft.snapshot.units, draft.units) }, draft)
}

export function useSetupSuggestion(draft: NativeProgramSetupDraft, key: string) {
  const value = suggestionForDraft(draft, key)
  return invalidateSetupReview({ ...draft, rawValues: { ...draft.rawValues, [key]: value === null ? '' : String(value) }, manualKeys: draft.manualKeys.filter((item) => item !== key) })
}

export function updateSetupSettings(draft: NativeProgramSetupDraft, settings: Partial<Pick<NativeProgramSetupDraft, 'rounding' | 'trainingMaxPercent' | 'workingLoadPercent'>>) {
  const updated = { ...draft, ...settings }
  return invalidateSetupReview({ ...updated, rawValues: Object.fromEntries(draft.snapshot.stateValues.map((state) => {
    const value = suggestionForDraft(updated, state.key)
    return [state.key, draft.manualKeys.includes(state.key) ? draft.rawValues[state.key] : value === null ? '' : String(value)]
  })) })
}

export function canChangeSetupUnits(draft: NativeProgramSetupDraft) {
  return Object.entries(draft.rawValues).every(([key, raw]) => positiveSetupInput(raw) !== null || (!raw && !draft.manualKeys.includes(key)))
}

export function changeSetupUnits(draft: NativeProgramSetupDraft, units: Unit) {
  if (draft.units === units || !canChangeSetupUnits(draft)) return draft
  const next = { ...draft, units, rounding: units === 'kg' ? 2.5 : 5 }
  return invalidateSetupReview({ ...next, rawValues: Object.fromEntries(Object.entries(draft.rawValues).map(([key, raw]) => {
    const value = positiveSetupInput(raw)
    const suggestion = suggestionForDraft(next, key)
    return [key, value === null ? raw : draft.manualKeys.includes(key)
      ? String(mround(convertWeight(value, draft.units, units), next.rounding))
      : suggestion === null ? '' : String(suggestion)]
  })) })
}

/** Refresh only suggestions: even incomplete manual typing remains untouched. */
export function refreshSetupSuggestions(draft: NativeProgramSetupDraft, snapshot: ProgramSetupSuggestionSnapshot) {
  if (snapshot.templateId !== draft.templateId) return draft
  return updateSetupSettings({ ...draft, snapshot }, {})
}

export function changeSetupVariant(draft: NativeProgramSetupDraft, snapshot: ProgramSetupSuggestionSnapshot) {
  const seeded = createNativeSetupDraft(draft.accountId, draft.draftId, snapshot)
  return updateSetupSettings({ ...seeded, units: draft.units, revision: draft.revision }, {
    rounding: draft.rounding, trainingMaxPercent: draft.trainingMaxPercent, workingLoadPercent: draft.workingLoadPercent,
  })
}
