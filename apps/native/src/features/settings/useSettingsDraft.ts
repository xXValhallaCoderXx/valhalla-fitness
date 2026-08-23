import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Sex, ThemePreference, UserProfile } from '@sheetless/domain/account/types'
import {
  convertProgramStateDefaults,
  oneRepMaxKeys,
  sameNumberRecord,
  sameStringSet,
} from '@sheetless/domain/account/settings-form'
import type { ProgramStateDefaults, Unit } from '@sheetless/domain/shared/types'

export type SettingsDraftValues = {
  units: Unit
  rounding: number
  equipmentProfile: string[]
  themePreference: ThemePreference
  programStateDefaults: ProgramStateDefaults
  sex: Sex | null
  autoStartTimer: boolean
  defaultRestSeconds: number
}

type DraftState = {
  values: SettingsDraftValues
  baseline: SettingsDraftValues
  estimateInputs: Record<string, string>
  baselineEstimateInputs: Record<string, string>
}

const MAX_PROFILE_LOAD = 100_000

function valuesFromProfile(profile: UserProfile): SettingsDraftValues {
  return {
    units: profile.units,
    rounding: profile.rounding,
    equipmentProfile: [...profile.equipmentProfile],
    themePreference: profile.themePreference,
    programStateDefaults: { ...profile.programStateDefaults },
    sex: profile.sex ?? null,
    autoStartTimer: profile.autoStartTimer,
    defaultRestSeconds: profile.defaultRestSeconds,
  }
}

function inputsFromDefaults(defaults: ProgramStateDefaults) {
  return Object.fromEntries(
    oneRepMaxKeys.map((key) => [key, defaults[key] == null ? '' : String(defaults[key])]),
  )
}

function stateFromProfile(profile: UserProfile): DraftState {
  const values = valuesFromProfile(profile)
  const estimateInputs = inputsFromDefaults(values.programStateDefaults)
  return {
    values,
    baseline: valuesFromProfile(profile),
    estimateInputs,
    baselineEstimateInputs: { ...estimateInputs },
  }
}

function sameValues(left: SettingsDraftValues, right: SettingsDraftValues) {
  return (
    left.units === right.units &&
    left.rounding === right.rounding &&
    left.themePreference === right.themePreference &&
    left.sex === right.sex &&
    left.autoStartTimer === right.autoStartTimer &&
    left.defaultRestSeconds === right.defaultRestSeconds &&
    sameStringSet(left.equipmentProfile, right.equipmentProfile) &&
    sameNumberRecord(left.programStateDefaults, right.programStateDefaults)
  )
}

function sameInputs(left: Record<string, string>, right: Record<string, string>) {
  return oneRepMaxKeys.every((key) => (left[key] ?? '') === (right[key] ?? ''))
}

function estimateError(rawValue: string) {
  if (!rawValue.trim()) return null
  const value = Number(rawValue)
  if (!Number.isFinite(value) || value <= 0) return 'Enter a number greater than zero.'
  if (value > MAX_PROFILE_LOAD) return 'Enter a value no greater than 100,000.'
  return null
}

export function useSettingsDraft(profile: UserProfile) {
  const [state, setState] = useState(() => stateFromProfile(profile))
  const dirty = !sameValues(state.values, state.baseline) ||
    !sameInputs(state.estimateInputs, state.baselineEstimateInputs)

  useEffect(() => {
    setState((current) => {
      const currentIsDirty = !sameValues(current.values, current.baseline) ||
        !sameInputs(current.estimateInputs, current.baselineEstimateInputs)
      return currentIsDirty ? current : stateFromProfile(profile)
    })
  }, [profile])

  const updateValues = useCallback((update: (current: SettingsDraftValues) => SettingsDraftValues) => {
    setState((current) => ({ ...current, values: update(current.values) }))
  }, [])

  const setUnits = useCallback((units: Unit) => {
    setState((current) => {
      if (current.values.units === units) return current
      const programStateDefaults = convertProgramStateDefaults(
        current.values.programStateDefaults,
        current.values.units,
        units,
        current.values.rounding,
      )
      return {
        ...current,
        values: { ...current.values, units, programStateDefaults },
        estimateInputs: inputsFromDefaults(programStateDefaults),
      }
    })
  }, [])

  const setEstimateInput = useCallback((key: string, rawValue: string) => {
    setState((current) => {
      const numeric = Number(rawValue)
      const value = rawValue.trim() && Number.isFinite(numeric) && numeric > 0 ? numeric : null
      return {
        ...current,
        values: {
          ...current.values,
          programStateDefaults: { ...current.values.programStateDefaults, [key]: value },
        },
        estimateInputs: { ...current.estimateInputs, [key]: rawValue },
      }
    })
  }, [])

  const setEstimateValue = useCallback((key: string, value: number | null) => {
    setState((current) => ({
      ...current,
      values: {
        ...current.values,
        programStateDefaults: { ...current.values.programStateDefaults, [key]: value },
      },
      estimateInputs: { ...current.estimateInputs, [key]: value == null ? '' : String(value) },
    }))
  }, [])

  const discard = useCallback(() => {
    setState((current) => ({
      values: { ...current.baseline, equipmentProfile: [...current.baseline.equipmentProfile], programStateDefaults: { ...current.baseline.programStateDefaults } },
      baseline: current.baseline,
      estimateInputs: { ...current.baselineEstimateInputs },
      baselineEstimateInputs: current.baselineEstimateInputs,
    }))
  }, [])

  const reset = useCallback((nextProfile: UserProfile) => setState(stateFromProfile(nextProfile)), [])
  const estimateErrors = useMemo(
    () => Object.fromEntries(oneRepMaxKeys.map((key) => [key, estimateError(state.estimateInputs[key] ?? '')])),
    [state.estimateInputs],
  )
  const hasValidationErrors = Object.values(estimateErrors).some(Boolean)

  return {
    values: state.values,
    baseline: state.baseline,
    estimateInputs: state.estimateInputs,
    estimateErrors,
    dirty,
    hasValidationErrors,
    setUnits,
    setRounding: (rounding: number) => updateValues((current) => ({ ...current, rounding })),
    setThemePreference: (themePreference: ThemePreference) =>
      updateValues((current) => ({ ...current, themePreference })),
    setSex: (sex: Sex | null) => updateValues((current) => ({ ...current, sex })),
    setAutoStartTimer: (autoStartTimer: boolean) =>
      updateValues((current) => ({ ...current, autoStartTimer })),
    setDefaultRestSeconds: (defaultRestSeconds: number) =>
      updateValues((current) => ({ ...current, defaultRestSeconds })),
    setEstimateInput,
    setEstimateValue,
    discard,
    reset,
  }
}
