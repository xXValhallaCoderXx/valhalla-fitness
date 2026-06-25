import type {
  AccessoryMovementOption,
  MovementHistorySet,
  MovementSlot,
  SetLog,
  SubstitutionReason,
  WorkoutSession,
} from '~/shared/types'

export const SET_GRID_CLASS = 'grid grid-cols-[1.15rem_minmax(3.75rem,1fr)_minmax(3rem,0.75fr)_minmax(4.75rem,1fr)_2.25rem] sm:grid-cols-[1.25rem_minmax(4.5rem,7.75rem)_minmax(3.25rem,6.5rem)_minmax(5rem,6.5rem)_2.25rem] md:grid-cols-[1.5rem_minmax(4.75rem,1fr)_minmax(4rem,0.8fr)_minmax(5.5rem,1fr)_minmax(7.5rem,1.35fr)_2.25rem]'

export const substitutionReasons: { value: SubstitutionReason; label: string }[] = [
  { value: 'equipment_missing', label: 'Equipment taken' },
  { value: 'crowded_gym', label: 'Crowded gym' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'preference', label: 'Variety' },
  { value: 'other', label: 'Other' },
]

const accessoryCategoryOrder = ['lower', 'hinge', 'posterior_chain', 'upper', 'upper_back', 'core']

export function isMovementComplete(movement: MovementSlot) {
  return movement.sets.length > 0 && movement.sets.every((set) => set.completed)
}

export function getTopSet(movement: MovementSlot) {
  return movement.sets.find((set) => set.isTopSet || set.isAmrap) ?? movement.sets.at(-1)
}

export function getProgressionHint(movement: MovementSlot, topSet?: SetLog) {
  if (!topSet) return 'Complete the prescribed work and log RIR so recommendations stay accurate.'
  if (movement.role === 'main') {
    return `${formatSetTarget(topSet)} is the key set. Extra clean reps with honest RIR can support a stronger progression call.`
  }
  return 'Stay inside the target rep range and record RIR to make accessory progression reviewable later.'
}

export function formatSetTarget(set: SetLog, units?: string, includeUnit = true) {
  const load = set.targetLoad ?? set.actualLoad
  const reps = set.targetReps ?? (set.targetRepMin && set.targetRepMax ? `${set.targetRepMin}-${set.targetRepMax}` : set.targetRepMin)
  const loadText = load == null ? '—' : `${formatNumber(load)}${includeUnit && units ? ` ${units}` : ''}`
  const repsText = reps == null ? '—' : `${reps}${set.isAmrap ? '+' : ''}`
  return `${loadText} × ${repsText}`
}

export function formatHistorySet(set: MovementHistorySet, units?: string) {
  const load = set.actualLoad ?? set.targetLoad
  const reps = set.actualReps ?? set.targetReps ?? (set.targetRepMin && set.targetRepMax ? `${set.targetRepMin}-${set.targetRepMax}` : set.targetRepMin)
  const loadText = load == null ? '—' : `${formatNumber(load)}${units ? ` ${units}` : ''}`
  const repsText = reps == null ? '—' : `${reps}${set.isAmrap ? '+' : ''}`
  const rirText = typeof set.actualRir === 'number' ? ` @ RIR ${set.actualRir}` : ''
  return `${loadText} × ${repsText}${rirText}`
}

export function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value)) return 0
  if (!step) return value
  return Math.round(value / step) * step
}

export function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

export function formatCategoryLabel(value: string) {
  return formatEquipmentLabel(value)
}

export function buildAccessoryCategoryFilters(options: AccessoryMovementOption[]) {
  const counts = new Map<string, number>()
  for (const option of options) counts.set(option.category, (counts.get(option.category) ?? 0) + 1)

  return Array.from(counts.entries())
    .sort(([left], [right]) => {
      const leftIndex = accessoryCategoryOrder.indexOf(left)
      const rightIndex = accessoryCategoryOrder.indexOf(right)
      if (leftIndex !== -1 || rightIndex !== -1) {
        if (leftIndex === -1) return 1
        if (rightIndex === -1) return -1
        return leftIndex - rightIndex
      }
      return formatCategoryLabel(left).localeCompare(formatCategoryLabel(right))
    })
    .map(([value, count]) => ({
      value,
      count,
      label: formatCategoryLabel(value),
    }))
}

export function formatEquipmentLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function phaseScopeLabel(session: WorkoutSession) {
  const phaseKey = session.movements.find((movement) => movement.phaseKey)?.phaseKey
  if (phaseKey === 'cycle') return 'Rest of this cycle'
  if (phaseKey) return `Rest of ${phaseKey} phase`
  return 'Rest of this phase'
}
