import { evaluateTrainingMaxBand } from '@sheetless/domain/program/progression'
import { mround } from '@sheetless/domain/shared/math'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { fixedLoadKey, percentOf } from '@sheetless/domain/program/return-loads'
import { programmeWeekIndex } from '@sheetless/domain/program/program-phase-map'
import type { MovementSlot, PlannedSession, SetLog } from '@sheetless/domain/session/types'
import type { ProgramInstance, ProgramStateOverview, ProgramStateType } from '@sheetless/domain/program/types'

/**
 * Why a planned load is the number it is.
 *
 * Everything here is re-derived from what the set already carries — `sourcePrescription` (the DSL
 * set, with its percent) and `sourceBinding` (the state value used at expansion) — plus the
 * session's rounding. Nothing new is persisted.
 */
export type TraceInput = {
  label: string
  value: string
  /** Where this input came from; null when it has no history worth showing. */
  provenance: string | null
}

export type LoadTrace = {
  /** "Deadlift · set 3 · top set" */
  subject: string
  /** "Week 3 · Peak" */
  context: string
  /** =MROUND(TM_deadlift × 0.95, 2.5) */
  expression: string
  /** =MROUND(192.5 × 0.95, 2.5) */
  substituted: string
  /** =MROUND(182.875, 2.5) — the last reducible step, omitted when there isn't one. */
  evaluated: string | null
  result: string
  inputs: TraceInput[]
  /**
   * False when the re-derived value disagrees with the load actually on screen — an override, a
   * return-period rewrite, or a snapshot taken before the state moved. A trace that quietly
   * contradicts the number beside it is worse than no trace, so the UI must say so.
   */
  matchesPlannedLoad: boolean
  /** The computed value an override replaced, when one did. */
  overriddenFrom: number | null
}

/**
 * Numbers inside a formula print at full precision.
 *
 * `formatNumber` from set-notation is weight-shaped — one decimal — which would render a 0.95
 * percentage as "0.9" and the intermediate 182.875 as "182.9". A trace that rounds its own
 * workings is not a trace.
 */
function traceNumber(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(4)))
}

/** The design writes `TM_deadlift`; the code stores `deadlift_training_max`. */
const STATE_TYPE_PREFIX: Record<ProgramStateType, string> = {
  training_max: 'TM',
  one_rep_max: '1RM',
  five_rep_max: '5RM',
  working_load: 'WL',
  manual: 'MANUAL',
}

/** `deadlift_training_max` → `TM_deadlift`. Display only — the stored key stays authoritative. */
export function stateKeyLabel(stateKey: string, stateType: ProgramStateType): string {
  const suffix = `_${stateType}`
  const movementId = stateKey.endsWith(suffix) ? stateKey.slice(0, -suffix.length) : stateKey
  return `${STATE_TYPE_PREFIX[stateType]}_${movementId}`
}

function setLabel(set: SetLog): string {
  if (set.isTopSet) return 'top set'
  if (set.isBackoff) return 'back-off'
  return `set ${set.setIndex}`
}

/**
 * Look up whether an explicit override replaced this set's computed load.
 *
 * Overrides only ever apply to `fixed` sets, and `referencedStateKey` returns null for those — so
 * an overridden set carries no binding and no marker of its own. Without this lookup the panel
 * would render a formula that did not produce the number on screen.
 */
function findOverride(
  set: SetLog,
  movement: MovementSlot,
  session: PlannedSession,
  program: ProgramInstance | null | undefined,
): number | null {
  if (!program?.loadOverrides?.length || !session.templateSessionId) return null
  const definition = program.templateDefinition
  // `session.weekIndex` is the global session counter; the override key uses the programme week.
  const weekIndex = definition ? programmeWeekIndex(session.weekIndex, definition) : null
  if (weekIndex === null) return null
  const key = fixedLoadKey({
    templateSessionId: session.templateSessionId,
    slotId: movement.slotId ?? movement.id,
    weekIndex,
    movementId: movement.movementId,
    setIndex: set.setIndex,
  })
  return program.loadOverrides.find((override) => override.key === key)?.value ?? null
}

export function buildLoadTrace({
  set,
  movement,
  session,
  program,
}: {
  set: SetLog
  movement: MovementSlot
  session: PlannedSession
  program?: ProgramInstance | null
}): LoadTrace | null {
  const load = set.sourcePrescription?.targetLoad
  const units = session.units
  const subject = `${movement.performedMovementName ?? movement.movementName} · ${setLabel(set)}`
  const context = [session.weekLabel, session.phaseLabel].filter(Boolean).join(' · ')
  const override = findOverride(set, movement, session, program)

  // Manually added accessories bypass template expansion entirely, so they carry no prescription
  // and there is nothing to explain — the lifter chose the load.
  if (!load) return null
  if (load.kind === 'user_selected') return null
  if (load.kind === 'percent_of_state' && load.default === 'blank') return null

  if (load.kind === 'fixed') {
    const value = units === 'kg' ? load.kg : (load.lb ?? load.kg)
    return {
      subject,
      context,
      expression: `= ${formatWeight(value, units)}`,
      substituted: `= ${formatWeight(value, units)}`,
      evaluated: null,
      result: formatWeight(override ?? value, units) ?? '—',
      inputs: [{ label: 'fixed load', value: formatWeight(value, units) ?? '—', provenance: 'set by the template' }],
      matchesPlannedLoad: (override ?? value) === set.targetLoad,
      overriddenFrom: override === null ? null : value,
    }
  }

  const binding = set.sourceBinding
  if (!binding) return null
  const keyLabel = stateKeyLabel(binding.stateKey, binding.stateType)
  const stateValue = binding.value

  if (load.kind === 'state') {
    return {
      subject,
      context,
      expression: `= ${keyLabel}`,
      substituted: `= ${traceNumber(stateValue)}`,
      evaluated: null,
      result: formatWeight(stateValue, units) ?? '—',
      inputs: [
        { label: keyLabel, value: formatWeight(stateValue, units) ?? '—', provenance: null },
      ],
      matchesPlannedLoad: stateValue === set.targetLoad,
      overriddenFrom: null,
    }
  }

  const percent = percentOf(load)
  const rounding = session.rounding
  const raw = stateValue * percent
  const computed = mround(raw, rounding)

  return {
    subject,
    context,
    expression: `=MROUND(${keyLabel} × ${traceNumber(percent)}, ${traceNumber(rounding)})`,
    substituted: `=MROUND(${traceNumber(stateValue)} × ${traceNumber(percent)}, ${traceNumber(rounding)})`,
    evaluated: `=MROUND(${traceNumber(raw)}, ${traceNumber(rounding)})`,
    result: formatWeight(computed, units) ?? '—',
    inputs: [
      { label: keyLabel, value: formatWeight(stateValue, units) ?? '—', provenance: null },
      {
        label: 'percent',
        value: traceNumber(percent),
        provenance: [session.weekLabel, `set ${set.setIndex}`, 'template'].filter(Boolean).join(' · '),
      },
      {
        label: 'rounding',
        value: formatWeight(rounding, units) ?? '—',
        provenance: 'programme setting',
      },
    ],
    matchesPlannedLoad: computed === set.targetLoad,
    overriddenFrom: null,
  }
}

/**
 * "set 12 Jul · training_max_standard · +5.0" — how a state last moved.
 *
 * Needs an accepted decision, which only the programme overview carries; returns null when the
 * value has never changed or the history isn't loaded, rather than inventing a cause.
 */
export function stateChangeProvenance(
  state: ProgramStateOverview | undefined,
  units: string,
): string | null {
  if (!state) return null
  const decision = state.lastAcceptedDecision
  if (!decision) return state.updatedAt ? `set ${formatCompactDate(state.updatedAt)}` : null
  const parts: string[] = []
  if (decision.resolvedAt) parts.push(`set ${formatCompactDate(decision.resolvedAt)}`)
  parts.push(decision.ruleId)
  if (typeof decision.previousValue === 'number' && typeof decision.recommendedValue === 'number') {
    const delta = decision.recommendedValue - decision.previousValue
    if (delta !== 0) parts.push(`${delta > 0 ? '+' : ''}${traceNumber(delta)} ${units}`)
  }
  return parts.join(' · ')
}

export type ProjectedBand = {
  band: 'double' | 'standard' | 'hold' | 'reset'
  /** "≥ 3 reps at RIR ≥ 2" */
  condition: string
  /** The training max this outcome would produce. */
  value: number
  ruleId: string
}

/**
 * What this set decides, for every outcome.
 *
 * Rather than restate the band table (and risk it drifting from the rule), this asks
 * `evaluateTrainingMaxBand` itself — feeding it a synthetic result engineered to land in each
 * band and reading back the training max it returns. The increments stay private where they live.
 */
export function projectTrainingMaxBands({
  currentTm,
  rounding,
  movementId,
  stateKey,
  targetReps,
}: {
  currentTm: number
  rounding: number
  movementId: string
  stateKey: string
  targetReps: number
}): ProjectedBand[] {
  const target = Math.max(1, targetReps)
  const reps = (count: number) => `${count} ${count === 1 ? 'rep' : 'reps'}`
  const probes = [
    { band: 'double' as const, condition: `≥ ${reps(target + 2)} at RIR ≥ 2`, set: { actualReps: target + 2, actualRir: 2, targetReps: target } },
    { band: 'standard' as const, condition: `≥ ${reps(target)}, effort ok`, set: { actualReps: target, actualRir: 3, targetReps: target } },
    { band: 'hold' as const, condition: 'RIR ≤ 1', set: { actualReps: target, actualRir: 1, targetReps: target } },
    { band: 'reset' as const, condition: `fewer than ${reps(target)}`, set: { actualReps: target - 1, actualRir: 3, targetReps: target } },
  ]
  return probes.map(({ band, condition, set }) => {
    const decision = evaluateTrainingMaxBand([set], currentTm, rounding, movementId, stateKey)
    return { band, condition, value: decision.recommendedValue ?? currentTm, ruleId: decision.ruleId }
  })
}

/**
 * The set that defines a movement's load.
 *
 * The Today ledger lists one row per movement, but a trace explains one set — so selecting a
 * movement traces the set that decides it: the top set where there is one, else the heaviest
 * loaded set. Matches how the design labels the panel ("Deadlift · set 3 · top set").
 */
export function definingSet(movement: MovementSlot): SetLog | null {
  const topSet = movement.sets.find((set) => set.isTopSet)
  if (topSet) return topSet
  const loaded = movement.sets.filter((set) => typeof set.targetLoad === 'number' && set.targetLoad > 0)
  if (!loaded.length) return movement.sets[0] ?? null
  return loaded.reduce((heaviest, set) => ((set.targetLoad ?? 0) > (heaviest.targetLoad ?? 0) ? set : heaviest))
}
