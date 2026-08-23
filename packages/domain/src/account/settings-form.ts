import { getMovementName } from '@sheetless/domain/movement/movements'
import { convertWeight, e1rm, mround } from '@sheetless/domain/shared/math'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import type { ProgramStateDefaults, Unit } from '@sheetless/domain/shared/types'

export type KnownSetInput = {
  weight: string
  reps: string
  rir: string
}

export const oneRepMaxKeys = [
  'squat_one_rep_max',
  'bench_press_one_rep_max',
  'deadlift_one_rep_max',
  'overhead_press_one_rep_max',
  'barbell_row_one_rep_max',
]

export function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const normalizedLeft = [...left].sort()
  const normalizedRight = [...right].sort()
  return normalizedLeft.every((value, index) => value === normalizedRight[index])
}

export function sameNumberRecord(left: ProgramStateDefaults, right: ProgramStateDefaults) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if ((left[key] ?? null) !== (right[key] ?? null)) return false
  }
  return true
}

/**
 * Convert saved programme load defaults when the account display unit changes.
 * Active programmes keep their own unit snapshot; these values seed future
 * programmes only.
 */
export function convertProgramStateDefaults(
  defaults: ProgramStateDefaults,
  sourceUnits: Unit,
  targetUnits: Unit,
  targetRounding: number,
): ProgramStateDefaults {
  if (sourceUnits === targetUnits) return { ...defaults }

  const minimumLoad = Number.isFinite(targetRounding) && targetRounding > 0
    ? targetRounding
    : null

  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => {
      if (!hasLoadDefault(value)) return [key, value]

      const converted = convertWeight(value, sourceUnits, targetUnits)
      const rounded = mround(converted, targetRounding)
      return [key, rounded > 0 ? rounded : (minimumLoad ?? converted)]
    }),
  )
}

export function hasLoadDefault(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function buildLiftOptions(defaults: ProgramStateDefaults, units: Unit) {
  const groups: Array<{ group: string; items: Array<{ value: string; label: string }> }> = []
  const unset = oneRepMaxKeys.filter((key) => !hasLoadDefault(defaults[key] ?? null))
  const set = oneRepMaxKeys.filter((key) => hasLoadDefault(defaults[key] ?? null))
  if (unset.length) {
    groups.push({
      group: 'Not set yet',
      items: unset.map((key) => ({ value: key, label: getMovementName(key.replace(/_one_rep_max$/, '')) })),
    })
  }
  if (set.length) {
    groups.push({
      group: 'Already set',
      items: set.map((key) => ({
        value: key,
        label: `${getMovementName(key.replace(/_one_rep_max$/, ''))} · ${formatWeight(defaults[key]!, units)}`,
      })),
    })
  }
  return groups
}

export function firstUnsetKey(defaults: ProgramStateDefaults) {
  return oneRepMaxKeys.find((key) => !hasLoadDefault(defaults[key] ?? null)) ?? null
}

export function nextUnsetKey(defaults: ProgramStateDefaults, excludeKey: string) {
  return oneRepMaxKeys.find((key) => key !== excludeKey && !hasLoadDefault(defaults[key] ?? null)) ?? null
}

export function loadDefaultFromInput(value: string) {
  if (!value.trim()) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

export function calculateEstimatedOneRepMax(input: KnownSetInput | undefined) {
  if (!input) return null
  const weight = loadDefaultFromInput(input.weight)
  const reps = loadDefaultFromInput(input.reps)
  if (!weight || !reps) return null
  const rir = loadDefaultFromInput(input.rir) ?? 0
  const estimated = e1rm(weight, reps, rir)
  return hasLoadDefault(estimated) ? estimated : null
}

export function calculateOneRepMaxFromKnownSet(input: KnownSetInput | undefined, rounding: number) {
  const estimated = calculateEstimatedOneRepMax(input)
  if (!estimated) return null
  return mround(estimated, rounding)
}

export function strengthEstimateLabel(key: string) {
  const movementId = key.replace(/_one_rep_max$/, '')
  // Just the lift name — the "Estimated 1RMs" section header already provides the context,
  // and the full "… estimated 1RM" truncated on mobile.
  return getMovementName(movementId)
}

export function formatEquipmentLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
