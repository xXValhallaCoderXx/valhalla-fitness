import type { E1rmPoint, LiftE1rmSeries } from '@sheetless/domain/history/types'
import type { ProgramStateDefaults, Unit } from '@sheetless/domain/shared/types'
import type { ProgramStateInput, ProgramStateType } from '@sheetless/domain/program/types'
import { convertWeight, mround } from '@sheetless/domain/shared/math'
import { profileOneRepMax } from '@sheetless/domain/program/program-loads'
import { getMovementName } from '@sheetless/domain/movement/movements'

/** Where the 1RM behind a starting number came from. */
export type SetupLiftSource = 'history' | 'estimate' | 'none'

export type SetupLiftBestSet = {
  load: number
  reps: number
  /** Calendar date (YYYY-MM-DD) of the session it was logged in. */
  date: string
}

export type SetupLiftAnchor = {
  e1rm: number
  source: Exclude<SetupLiftSource, 'none'>
  /** The logged set behind the e1RM; null when the anchor is a saved estimate. */
  bestSet: SetupLiftBestSet | null
}

export type SetupLiftRow = {
  key: string
  movementId: string
  label: string
  type: ProgramStateType
  bestSet: SetupLiftBestSet | null
  e1rm: number | null
  source: SetupLiftSource
  /** The percentage applied to the e1RM for this state type. */
  percent: number
  /** What the percentage derives right now. */
  suggested: number | null
  /** What will actually be saved — `suggested` unless it has been typed over. */
  value: number | null
  /** True when `value` no longer matches what the percentage would produce. */
  edited: boolean
}

/**
 * The 1RM a starting number should be built from: the best set actually logged, else the saved
 * estimate from Settings › Starting strength.
 *
 * Outliers are skipped — `buildLiftE1rmSeries` flags sets whose e1RM the rest of the history
 * cannot support (a mistyped load), and seeding a whole programme off a typo is exactly the
 * failure this ordering exists to avoid.
 */
export function resolveSetupLiftAnchor({
  movementId,
  liftSeries,
  defaults,
}: {
  movementId: string
  liftSeries: LiftE1rmSeries[] | null
  defaults: ProgramStateDefaults
}): SetupLiftAnchor | null {
  const series = liftSeries?.find((lift) => lift.movementId === movementId) ?? null
  const best = (series?.points ?? [])
    .filter((point) => !point.outlier)
    .reduce<E1rmPoint | null>((top, point) => (!top || point.e1rm > top.e1rm ? point : top), null)

  if (best) {
    return {
      e1rm: best.e1rm,
      source: 'history',
      bestSet: { load: best.load, reps: best.reps, date: best.date },
    }
  }

  const estimate = profileOneRepMax(defaults, movementId)
  if (estimate === null) return null
  return { e1rm: estimate, source: 'estimate', bestSet: null }
}

/** A resolver `buildProgramStartStateValues` can seed from, so the table and the saved values agree. */
export function setupOneRepMaxResolver({
  liftSeries,
  defaults,
}: {
  liftSeries: LiftE1rmSeries[] | null
  defaults: ProgramStateDefaults
}) {
  return (movementId: string) =>
    resolveSetupLiftAnchor({ movementId, liftSeries, defaults })?.e1rm ?? null
}

/**
 * One row per required state key: what it was derived from, and what it is now.
 *
 * `source` is not decoration. The design is explicit that best sets come from history and anything
 * without one falls back to a saved estimate — a table that mixed the two silently would give a
 * guess the same authority as a logged lift.
 */
export function buildSetupLiftRows({
  stateValues,
  liftSeries,
  defaults,
  rounding,
  trainingMaxPercent,
  workingLoadPercent,
}: {
  stateValues: ProgramStateInput[]
  liftSeries: LiftE1rmSeries[] | null
  defaults: ProgramStateDefaults
  rounding: number
  trainingMaxPercent: number
  workingLoadPercent: number
}): SetupLiftRow[] {
  return stateValues.map((state) => {
    const anchor = resolveSetupLiftAnchor({ movementId: state.movementId, liftSeries, defaults })
    const percent = percentForStateType(state.type, trainingMaxPercent, workingLoadPercent)
    const suggested = anchor ? mround(anchor.e1rm * (percent / 100), rounding) : null
    return {
      key: state.key,
      movementId: state.movementId,
      // `requiredState.label` is optional and unset on every built-in template, so falling back to
      // the raw id would print "bench_press" in the lift column.
      label: state.label ?? getMovementName(state.movementId),
      type: state.type,
      bestSet: anchor?.bestSet ?? null,
      e1rm: anchor?.e1rm ?? null,
      source: anchor?.source ?? 'none',
      percent,
      suggested,
      value: state.value,
      edited:
        state.value !== null && suggested !== null && Math.abs(state.value - suggested) > 1e-9,
    }
  })
}

/** Derived state types take a share of the 1RM; everything else is entered as-is. */
export function percentForStateType(
  type: ProgramStateType,
  trainingMaxPercent: number,
  workingLoadPercent: number,
): number {
  if (type === 'training_max') return trainingMaxPercent
  if (type === 'working_load') return workingLoadPercent
  return 100
}

/** The step lifters actually load in each unit: 2.5 kg plates, 5 lb plates. */
export const ROUNDING_BY_UNIT: Record<Unit, number> = { kg: 2.5, lb: 5 }

export function roundingForUnit(unit: Unit): number {
  return ROUNDING_BY_UNIT[unit]
}

/**
 * Switching units converts the numbers; it never just relabels them.
 *
 * Leaving "130" on screen and calling it lb would quietly turn a 130 kg training max into a 59 kg
 * one, and the programme would be wrong from its first session with nothing on screen to say so.
 */
export function convertSetupStateValues(
  stateValues: ProgramStateInput[],
  from: Unit,
  to: Unit,
  rounding: number,
): ProgramStateInput[] {
  if (from === to) return stateValues
  return stateValues.map((state) => ({
    ...state,
    unit: to,
    value: state.value === null ? null : mround(convertWeight(state.value, from, to), rounding),
  }))
}
