import type { AccessoryProgressionMethod, SetTarget } from '~/types/training'

export const accessoryProgressionOptions: Array<{ value: AccessoryProgressionMethod; label: string }> = [
  { value: 'history_only', label: 'None (history only)' },
  { value: 'double_progression', label: 'Double progression' },
]

const progressionRuleByMethod: Record<AccessoryProgressionMethod, string | null> = {
  history_only: null,
  double_progression: 'accessory_double_progression',
}

export function isAccessoryProgressionMethod(value: unknown): value is AccessoryProgressionMethod {
  return value === 'history_only' || value === 'double_progression'
}

export function accessoryProgressionRuleId(method: AccessoryProgressionMethod): string | null {
  return progressionRuleByMethod[method]
}

export function accessoryProgressionLabel(method: AccessoryProgressionMethod) {
  return method === 'double_progression' ? 'Double progression' : 'History only'
}

export type AccessoryRepTarget = {
  label: string
  targetReps?: number | null
  targetRepMin?: number | null
  targetRepMax?: number | null
}

export function parseAccessoryRepTarget(value: string): AccessoryRepTarget | null {
  const input = value.trim()
  if (!input) return null
  const rangeMatch = input.match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/)
  if (rangeMatch) {
    const first = Number(rangeMatch[1])
    const second = Number(rangeMatch[2])
    if (!validAccessoryRepCount(first) || !validAccessoryRepCount(second)) return null
    const targetRepMin = Math.min(first, second)
    const targetRepMax = Math.max(first, second)
    return {
      label: `${targetRepMin}-${targetRepMax}`,
      targetReps: null,
      targetRepMin,
      targetRepMax,
    }
  }

  const reps = Number(input)
  if (!validAccessoryRepCount(reps)) return null
  return {
    label: String(reps),
    targetReps: reps,
    targetRepMin: null,
    targetRepMax: null,
  }
}

export function accessoryTargetSummary(repTarget: AccessoryRepTarget, method: AccessoryProgressionMethod) {
  return `${repTarget.label} reps · ${accessoryProgressionLabel(method)}`
}

export function buildAccessoryInitialSets(repTarget: AccessoryRepTarget): SetTarget[] {
  return [
    {
      id: 'set-1',
      setIndex: 1,
      targetLoad: null,
      targetReps: repTarget.targetReps ?? null,
      targetRepMin: repTarget.targetRepMin ?? null,
      targetRepMax: repTarget.targetRepMax ?? null,
      targetRir: 2,
      targetRpe: null,
      isTopSet: false,
      isAmrap: false,
      isBackoff: false,
      label: repTarget.label,
    },
  ]
}

function validAccessoryRepCount(value: number) {
  return Number.isInteger(value) && value > 0 && value <= 100
}
