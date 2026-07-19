import type { SetLog, Unit } from './types'

export const LB_PER_KG = 2.20462262185

export function convertWeight(value: number, sourceUnits: Unit, targetUnits: Unit) {
  if (sourceUnits === targetUnits) return value
  return sourceUnits === 'lb' ? value / LB_PER_KG : value * LB_PER_KG
}

export function mround(value: number, increment: number) {
  if (!Number.isFinite(value) || !Number.isFinite(increment) || increment <= 0) return value
  return Math.round(value / increment) * increment
}

export function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value)) return 0
  return step ? Math.round(value / step) * step : value
}

export function e1rm(weight: number, reps: number, rir = 0) {
  if (weight <= 0 || reps <= 0) return 0
  return weight * (1 + (reps + Math.max(rir, 0)) / 30)
}

export type SetNotation = {
  plain: string
  technical: string
  compact: string
}

export type LiftValues = {
  load?: number | null
  reps?: number | null
  repsLabel?: string | null
  rir?: number | null
  e1rm?: number | null
  units?: Unit | string | null
  amrap?: boolean
}

export function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

export function formatWeight(load: number | null | undefined, units?: Unit | string | null) {
  if (load == null) return null
  return `${formatNumber(load)}${units ? ` ${units}` : ''}`
}

export function repsLeftLabel(rir: number | null | undefined) {
  if (typeof rir !== 'number' || !Number.isFinite(rir)) return null
  return rir <= 0 ? 'max effort' : `~${rir} left`
}

export function describeLift(values: LiftValues): SetNotation {
  const { load, reps, repsLabel, rir, units, amrap } = values
  const hasRir = typeof rir === 'number' && Number.isFinite(rir)
  const loadText = load == null || load === 0 ? 'Bodyweight' : formatWeight(load, units)!
  const repsCore = repsLabel ?? (reps == null ? null : String(reps))
  const repsText = repsCore == null ? '—' : `${repsCore}${amrap ? '+' : ''}`
  const left = repsLeftLabel(rir)
  const plain = [`${loadText} × ${repsText} reps`, ...(left ? [left] : [])].join(' · ')
  const technicalParts: string[] = []
  if (hasRir) technicalParts.push(`RIR ${rir}`)
  const estimated =
    values.e1rm != null && values.e1rm > 0
      ? values.e1rm
      : load != null && typeof reps === 'number'
        ? e1rm(load, reps, hasRir ? rir : 0)
        : 0
  if (estimated > 0) technicalParts.push(`e1RM ${formatWeight(Math.round(estimated * 10) / 10, units)}`)
  return {
    plain,
    technical: technicalParts.join(' · '),
    compact: `${loadText} × ${repsText}${left ? ` · ${left}` : ''}${hasRir ? ` (RIR ${rir})` : ''}`,
  }
}

type DescribableSet = Pick<
  SetLog,
  'actualLoad' | 'actualReps' | 'actualRir' | 'targetLoad' | 'targetReps' | 'targetRepMin' | 'targetRepMax' | 'isAmrap'
>

export function describeSet(set: DescribableSet, units?: Unit | string | null): SetNotation {
  const usingActualReps = set.actualReps != null
  const repsLabel =
    !usingActualReps && set.targetReps == null && set.targetRepMin != null && set.targetRepMax != null
      ? `${set.targetRepMin}-${set.targetRepMax}`
      : undefined
  return describeLift({
    load: set.actualLoad ?? set.targetLoad,
    reps: set.actualReps ?? set.targetReps ?? set.targetRepMin ?? null,
    repsLabel,
    rir: set.actualRir,
    units,
    amrap: Boolean(set.isAmrap) && !usingActualReps,
    e1rm:
      set.actualLoad != null && set.actualReps != null
        ? e1rm(set.actualLoad, set.actualReps, set.actualRir ?? 0)
        : undefined,
  })
}
