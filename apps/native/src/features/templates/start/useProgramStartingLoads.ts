import { useMemo, useState } from 'react'
import type { UserProfile } from '@sheetless/domain/account/types'
import type { HistoryInsights, LiftE1rmSeries } from '@sheetless/domain/history/types'
import { DEFAULT_TRAINING_MAX_PERCENT, DEFAULT_WORKING_LOAD_PERCENT } from '@sheetless/domain/program/program-loads'
import { buildSetupLiftRows, roundingForUnit, setupOneRepMaxResolver } from '@sheetless/domain/program/setup-lift-rows'
import { hasUsableStateValue, loadValueFromInput, stateValuesForProfileTemplate } from '@sheetless/domain/program/template-start-utils'
import type { ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { convertWeight, mround } from '@sheetless/domain/shared/math'
import type { Unit } from '@sheetless/domain/shared/types'

export type StartingHistory = Pick<HistoryInsights, 'liftSeries' | 'units'> | null

type LoadOptions = { units: Unit; rounding: number; trainingMaxPercent: number; workingLoadPercent: number }
type LoadDraft = LoadOptions & { values: Record<string, string>; editedKeys: string[] }

function sourcesInUnits(profile: UserProfile, history: StartingHistory, units: Unit) {
  const defaults = Object.fromEntries(Object.entries(profile.programStateDefaults).map(([key, value]) =>
    [key, value === null ? null : convertWeight(value, profile.units, units)],
  ))
  const liftSeries: LiftE1rmSeries[] | null = history?.units ? history.liftSeries.map((series) => ({
    ...series,
    points: series.points.map((point) => ({
      ...point,
      load: convertWeight(point.load, history.units!, units),
      e1rm: convertWeight(point.e1rm, history.units!, units),
    })),
  })) : null
  return { defaults, liftSeries }
}

/** A setup snapshots its source data, so a refetch cannot replace a typed starting load. */
export function useProgramStartingLoads(template: ProgramTemplateSummary, profile: UserProfile, history: StartingHistory) {
  const [source] = useState(() => ({ profile, history }))
  const derive = (options: LoadOptions) => {
    const { defaults, liftSeries } = sourcesInUnits(source.profile, source.history, options.units)
    return stateValuesForProfileTemplate(template, { ...source.profile, units: options.units, programStateDefaults: defaults },
      options.trainingMaxPercent, options.workingLoadPercent,
      { rounding: options.rounding, oneRepMaxFor: setupOneRepMaxResolver({ liftSeries, defaults }) })
  }
  const [baseline] = useState<LoadDraft>(() => {
    const options = {
      units: profile.units, rounding: profile.rounding,
      trainingMaxPercent: DEFAULT_TRAINING_MAX_PERCENT, workingLoadPercent: DEFAULT_WORKING_LOAD_PERCENT,
    }
    return { ...options, editedKeys: [], values: Object.fromEntries(derive(options).map((state) =>
      [state.key, hasUsableStateValue(state.value) ? String(state.value) : ''],
    )) }
  })
  const [draft, setDraft] = useState(baseline)
  const stateValues = useMemo(() => template.requiredState.map((state) => ({
    ...state, unit: draft.units, value: loadValueFromInput(draft.values[state.key] ?? ''),
  })), [draft.units, draft.values, template.requiredState])
  const { defaults, liftSeries } = sourcesInUnits(source.profile, source.history, draft.units)
  const liftRows = buildSetupLiftRows({ stateValues, defaults, liftSeries, ...draft })

  const updateOptions = (patch: Partial<LoadOptions>) => setDraft((current) => {
    const next = { ...current, ...patch }
    const converting = next.units !== current.units
    const suggestions = derive(next)
    const values = Object.fromEntries(suggestions.map((state) => {
      const raw = current.values[state.key] ?? ''
      const value = loadValueFromInput(raw)
      if (current.editedKeys.includes(state.key)) {
        return [state.key, converting && value !== null ? String(mround(convertWeight(value, current.units, next.units), next.rounding)) : raw]
      }
      return [state.key, hasUsableStateValue(state.value) ? String(state.value) : '']
    }))
    return { ...next, values }
  })

  return {
    units: draft.units, rounding: draft.rounding, trainingMaxPercent: draft.trainingMaxPercent,
    workingLoadPercent: draft.workingLoadPercent, draftValues: draft.values, stateValues, liftRows,
    missingValues: stateValues.filter((state) => !hasUsableStateValue(state.value)),
    stateValuesDirty: draft.units !== baseline.units || draft.rounding !== baseline.rounding ||
      draft.trainingMaxPercent !== baseline.trainingMaxPercent || draft.workingLoadPercent !== baseline.workingLoadPercent ||
      JSON.stringify(draft.values) !== JSON.stringify(baseline.values),
    setDraftValue: (key: string, value: string) => setDraft((current) => ({
      ...current, values: { ...current.values, [key]: value }, editedKeys: [...new Set([...current.editedKeys, key])],
    })),
    resetDraftValue: (key: string) => setDraft((current) => {
      const suggested = derive(current).find((state) => state.key === key)?.value
      return { ...current, values: { ...current.values, [key]: suggested == null ? '' : String(suggested) },
        editedKeys: current.editedKeys.filter((edited) => edited !== key) }
    }),
    setUnits: (units: Unit) => { if (units !== draft.units) updateOptions({ units, rounding: roundingForUnit(units) }) },
    setRounding: (rounding: number) => updateOptions({ rounding }),
    setTrainingMaxPercent: (trainingMaxPercent: number) => updateOptions({ trainingMaxPercent }),
    setWorkingLoadPercent: (workingLoadPercent: number) => updateOptions({ workingLoadPercent }),
  }
}
