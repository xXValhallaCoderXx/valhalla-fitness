import type { ExperienceMode } from '../account/types'
import { defaultsToBodyweightLoad } from '../movement/movements'
import { buildLoadTrace, definingSet } from '../program/load-trace'
import { percentOf } from '../program/return-loads'
import type { ProgramInstance, ProgramStateType } from '../program/types'
import { formatNumber, formatWeight } from '../shared/set-notation'
import { formatPreviousShort } from './live-session-utils'
import type { MovementSlot, PlannedSession, SetLog } from './types'

function reps(set: SetLog) {
  const value = set.targetReps ?? (set.targetRepMin != null && set.targetRepMax != null
    ? `${set.targetRepMin}–${set.targetRepMax}` : set.targetRepMin)
  return value == null ? set.isAmrap ? 'as many reps as you can' : 'reps of your choice' : `${value}${set.isAmrap ? '+' : ''}`
}

function setsLabel(sets: SetLog[], advanced: boolean) {
  if (!sets.length) return 'No sets planned'
  const targets = sets.map(reps)
  const sameReps = targets.every(value => value === targets[0])
  const count = `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}`
  return sameReps ? advanced ? `${sets.length} × ${targets[0]}` : `${count} of ${targets[0]}` : count
}

function effort(sets: SetLog[], advanced: boolean) {
  const rirs = [...new Set(sets.flatMap(set => set.targetRir == null ? [] : [set.targetRir]))]
  if (rirs.length) {
    const value = rirs.length === 1 ? formatNumber(rirs[0]) : `${Math.min(...rirs)}–${Math.max(...rirs)}`
    return advanced ? `RIR ${value}` : `leave ${value} ${value === '1' ? 'rep' : 'reps'}`
  }
  const rpes = [...new Set(sets.flatMap(set => set.targetRpe == null ? [] : [set.targetRpe]))]
  return rpes.length ? `effort ${rpes.join('–')} of 10` : null
}

const stateLabels: Record<ProgramStateType, string> = {
  training_max: 'training max', one_rep_max: 'one-rep max', five_rep_max: 'five-rep max',
  working_load: 'working weight', manual: 'programme reference',
}

export function todayLoadProvenance(movement: MovementSlot, session: PlannedSession, program?: ProgramInstance | null) {
  const set = definingSet(movement)
  if (!set) return null
  const trace = buildLoadTrace({ set, movement, session, program })
  if (!trace) return null
  if (!trace.matchesPlannedLoad) return 'Adjusted target · see calculation'
  if (trace.overriddenFrom !== null) return 'Your load override · see calculation'
  const source = set.sourcePrescription?.targetLoad
  const binding = set.sourceBinding
  if (source?.kind === 'percent_of_state' && binding) {
    return `${formatNumber(percentOf(source) * 100)}% of your ${formatWeight(binding.value, session.units)} ${stateLabels[binding.stateType]}, rounded to ${formatNumber(session.rounding)}`
  }
  if (source?.kind === 'state' && binding) return `From your ${formatWeight(binding.value, session.units)} ${stateLabels[binding.stateType]}`
  return 'Load set by the programme'
}

/** Compact native preview derived from the actual prescription, including return adjustments. */
export function todayMovementPreview(movement: MovementSlot, session: PlannedSession, mode: ExperienceMode) {
  const advanced = mode === 'full'
  const working = movement.sets.filter(set => !set.isBackoff)
  const backoff = movement.sets.filter(set => set.isBackoff)
  const loads = [...new Set(working.flatMap(set => set.targetLoad != null && set.targetLoad > 0 ? [set.targetLoad] : []))]
  const bodyweight = working.length > 0 && working.every(set => set.targetLoad === 0 ||
    (set.targetLoad == null && defaultsToBodyweightLoad(movement.performedMovementId ?? movement.movementId)))
  const loadLabel = loads.length ? `${loads.map(formatNumber).join(' · ')} ${session.units}` : bodyweight ? 'Bodyweight' : '—'
  const parts: (string | null)[] = []
  // Source percentages are only printed when they reproduce every displayed working load.
  const percentRamp = advanced && working.length > 1 && working.every(set =>
    set.sourcePrescription?.targetLoad?.kind === 'percent_of_state' &&
    buildLoadTrace({ set, movement, session })?.matchesPlannedLoad)
  parts.push(percentRamp ? working.map(set => {
    const load = set.sourcePrescription!.targetLoad!
    return `${formatNumber(percentOf(load) * 100)}%×${reps(set)}`
  }).join(' · ') : setsLabel(working, advanced))
  if (!advanced && loads.length) parts.push(loads.length > 1 ? `working up to ${formatWeight(Math.max(...loads), session.units)}` : `at ${loadLabel}`)
  if (!advanced && bodyweight) parts.push('bodyweight')
  parts.push(effort(working, advanced))
  if (backoff.length) {
    const backoffLoads = [...new Set(backoff.flatMap(set => set.targetLoad == null ? [] : [set.targetLoad]))]
    parts.push(`back-off ${setsLabel(backoff, advanced)}${backoffLoads.length === 1 ? ` at ${formatWeight(backoffLoads[0], session.units)}` : ''}`)
  }
  if (movement.previous && !movement.loadSuggestionCutoff) {
    const rir = movement.previous.rir
    parts.push(`last time ${formatPreviousShort(movement.previous, session.units)}${advanced && rir != null ? ` at RIR ${rir}` : ''}`)
  } else if (!loads.length && !bodyweight) parts.push('you choose the load')
  return { name: movement.performedMovementName ?? movement.movementName, loadLabel, prescription: parts.filter(Boolean).join(' · ') }
}
