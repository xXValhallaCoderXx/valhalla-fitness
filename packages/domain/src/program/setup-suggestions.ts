import type { HistorySessionInput } from '../history/history'
import { buildLiftE1rmSeries } from '../history/strength'
import { convertWeight, mround } from '../shared/math'
import type { ProgramStateDefaults, Unit } from '../shared/types'
import type { ProgramStateInput, ProgramStateRequirement } from './types'
import { profileOneRepMax, profileStateDefaultValue } from './program-loads'

export type SetupSuggestionRow = {
  key: string
  source: 'history' | 'estimate' | 'saved' | 'manual'
  /** Unrounded reference, in snapshot units. Null means manual entry is needed. */
  reference: number | null
  bestSet: { load: number; reps: number; date: string } | null
}

export type ProgramSetupSuggestionSnapshot = {
  templateId: string
  units: Unit
  rounding: number
  trainingMaxPercent: number
  workingLoadPercent: number
  stateValues: ProgramStateInput[]
  sourceRows: SetupSuggestionRow[]
  historyStatus: 'ready' | 'unavailable'
  unknownUnitSessions: number
}

/** Normalize first: unknown legacy units must never be interpreted as profile units. */
function recordedReferences(sessions: HistorySessionInput[], units: Unit) {
  const normalized = sessions.filter((session) => session.units === 'kg' || session.units === 'lb').map((session) => ({
    ...session, units,
    exercises: session.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({
      ...set, actualLoad: typeof set.actualLoad === 'number' && Number.isFinite(set.actualLoad)
        ? convertWeight(set.actualLoad, session.units!, units) : null,
    })) })),
  }))
  return new Map(buildLiftE1rmSeries(normalized).map((series) => {
    const best = series.points.filter((point) => !point.outlier).reduce<typeof series.points[number] | null>(
      (current, point) => !current || point.e1rm > current.e1rm ? point : current, null,
    )
    return [series.movementId, best]
  }))
}

export function setupSuggestionValue(state: ProgramStateInput, row: SetupSuggestionRow, settings: {
  rounding: number; trainingMaxPercent: number; workingLoadPercent: number
}) {
  if (row.reference === null) return null
  if (state.type === 'manual' || state.type === 'five_rep_max') return row.reference > 0 ? row.reference : null
  const percent = state.type === 'training_max' ? settings.trainingMaxPercent
    : state.type === 'working_load' ? settings.workingLoadPercent : 100
  const value = mround(row.reference * percent / 100, settings.rounding)
  return value > 0 ? value : null
}

export function buildProgramSetupSuggestions(input: {
  templateId: string; requiredState: ProgramStateRequirement[]; units: Unit; rounding: number
  defaults: ProgramStateDefaults; sessions: HistorySessionInput[]; historyStatus?: 'ready' | 'unavailable'
}): ProgramSetupSuggestionSnapshot {
  const references = recordedReferences(input.sessions, input.units)
  const sourceRows = input.requiredState.map((state): SetupSuggestionRow => {
    if (state.type === 'manual' || state.type === 'five_rep_max') {
      const saved = profileStateDefaultValue(state, input.defaults)
      return { key: state.key, source: saved === null ? 'manual' : 'saved', reference: saved, bestSet: null }
    }
    const point = references.get(state.movementId)
    if (point) return { key: state.key, source: 'history', reference: point.e1rm, bestSet: { load: point.load, reps: point.reps, date: point.date } }
    const estimate = profileOneRepMax(input.defaults, state.movementId)
    return { key: state.key, source: estimate === null ? 'manual' : 'estimate', reference: estimate, bestSet: null }
  })
  const settings = { rounding: input.rounding, trainingMaxPercent: 90, workingLoadPercent: 75 }
  const stateValues = input.requiredState.map((state, index) => ({
    ...state, unit: input.units, value: setupSuggestionValue({ ...state, value: null }, sourceRows[index], settings),
  }))
  return { templateId: input.templateId, units: input.units, ...settings, stateValues, sourceRows, historyStatus: input.historyStatus ?? 'ready', unknownUnitSessions: input.sessions.filter((session) => !session.units).length }
}
