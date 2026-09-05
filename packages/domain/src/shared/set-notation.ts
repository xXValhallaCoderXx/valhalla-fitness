import type { Unit } from '@sheetless/domain/shared/types'
import { externalLoadOrNull } from '@sheetless/domain/shared/load'
import { e1rm } from '@sheetless/domain/shared/math'

/**
 * Plain-language set notation with a quiet technical companion.
 *
 * `plain` reads in beginner terms ("147.5 kg × 7 reps · ~3 left"), `technical`
 * keeps the lifting shorthand advanced users scan ("RIR 3 · e1RM 196.5 kg"),
 * and `compact` folds both into one dense line ("147.5 kg × 7 · ~3 left (RIR 3)").
 */
export type SetNotation = {
  plain: string
  technical: string
  compact: string
}

export type LiftValues = {
  load?: number | null
  reps?: number | null
  /** Pre-formatted reps when not a single number (target ranges like "6-8"). */
  repsLabel?: string | null
  rir?: number | null
  /** Pre-computed estimated 1RM; when omitted it is derived from load/reps/rir. */
  e1rm?: number | null
  units?: Unit | string | null
  amrap?: boolean
}

/** "147.5" — trims a trailing .0, keeps one decimal otherwise. */
export function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

/** "147.5 kg" (or "147.5" without units). Null when load is missing. */
export function formatWeight(load: number | null | undefined, units?: Unit | string | null) {
  if (load == null) return null
  return `${formatNumber(load)}${units ? ` ${units}` : ''}`
}

/** Reps-in-reserve in plain words: "~3 left", or "max effort" at RIR 0. */
export function repsLeftLabel(rir: number | null | undefined) {
  if (typeof rir !== 'number' || !Number.isFinite(rir)) return null
  if (rir <= 0) return 'max effort'
  return `~${rir} left`
}

export function describeLift(values: LiftValues): SetNotation {
  const { load, reps, repsLabel, rir, units, amrap } = values
  const hasRir = typeof rir === 'number' && Number.isFinite(rir)
  const externalLoad = externalLoadOrNull(load)

  const loadText = externalLoad == null ? 'Bodyweight' : formatWeight(externalLoad, units)!
  const repsCore = repsLabel ?? (reps == null ? null : String(reps))
  const repsText = repsCore == null ? '—' : `${repsCore}${amrap ? '+' : ''}`

  const left = repsLeftLabel(rir)

  const plainParts = [`${loadText} × ${repsText} reps`]
  if (left) plainParts.push(left)
  const plain = plainParts.join(' · ')

  const technicalParts: string[] = []
  if (hasRir) technicalParts.push(`RIR ${rir}`)
  const estimated = externalLoad == null
    ? 0
    : values.e1rm != null && values.e1rm > 0
      ? values.e1rm
      : typeof reps === 'number'
        ? e1rm(externalLoad, reps, hasRir ? rir! : 0)
        : 0
  if (estimated > 0) {
    technicalParts.push(`e1RM ${formatWeight(Math.round(estimated * 10) / 10, units)}`)
  }
  const technical = technicalParts.join(' · ')

  const compact = `${loadText} × ${repsText}${left ? ` · ${left}` : ''}${hasRir ? ` (RIR ${rir})` : ''}`

  return { plain, technical, compact }
}

/** Structural subset accepted from session logs and history read models. */
type DescribableSet = {
  actualLoad?: number | null
  actualReps?: number | null
  actualRir?: number | null
  targetLoad?: number | null
  targetReps?: number | null
  targetRepMin?: number | null
  targetRepMax?: number | null
  isAmrap?: boolean
}

/** Describe a logged set, preferring actual values and falling back to targets. */
export function describeSet(set: DescribableSet, units?: Unit | string | null): SetNotation {
  const usingActualReps = set.actualReps != null
  const actualExternalLoad = externalLoadOrNull(set.actualLoad)
  const repsLabel =
    !usingActualReps && set.targetReps == null && set.targetRepMin != null && set.targetRepMax != null
      ? `${set.targetRepMin}-${set.targetRepMax}`
      : undefined
  return describeLift({
    // Once reps are logged, null/zero actual load is a loadless result and
    // must not inherit a planned cable/barbell target.
    load: usingActualReps ? set.actualLoad : set.targetLoad ?? set.actualLoad,
    reps: set.actualReps ?? set.targetReps ?? set.targetRepMin ?? null,
    repsLabel,
    rir: set.actualRir,
    units,
    // e1RM is only meaningful from actual performance.
    amrap: Boolean(set.isAmrap) && !usingActualReps,
    e1rm:
      actualExternalLoad != null && set.actualReps != null
        ? e1rm(actualExternalLoad, set.actualReps, set.actualRir ?? 0)
        : undefined,
  })
}
