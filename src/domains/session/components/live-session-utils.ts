import type {
  AccessoryMovementOption,
  MovementHistorySet,
  MovementSlot,
  PreviousComparable,
  SetLog,
  SubstitutionReason,
  WorkoutSession,
} from '~/shared/types'
import { describeSet } from '~/shared/lib/set-notation'

// Overview-only set table: SET · TARGET · KG · REPS · RIR · ✓ (Target is shown on mobile too,
// freed up by the narrow RIR chip). Desktop KG/Reps columns are wider to host the inline ±
// steppers on the selected row. Focus mode uses its own FocusSetCard layout.
export const SET_GRID_CLASS =
  'grid grid-cols-[1.375rem_minmax(0,1fr)_3.25rem_2.75rem_3rem_1.75rem] md:grid-cols-[2.25rem_minmax(0,1fr)_8rem_7.5rem_5.5rem_2.75rem]'

// Reps-in-reserve choices. The 3+ bucket also reflects any legacy values logged above 3.
export const RIR_OPTIONS: { value: number; label: string; hint: string }[] = [
  { value: 0, label: '0', hint: '0 — none left, max effort' },
  { value: 1, label: '1', hint: '1 — maybe one more rep' },
  { value: 2, label: '2', hint: '2 — two more reps' },
  { value: 3, label: '3+', hint: '3+ — three or more reps' },
]

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
  return describeSet(set, units).compact
}

/**
 * Compact "last time" label for the movement header, e.g. "90 kg × 5" — the full detail
 * (date, e1RM, RIR) stays in `previous.label` and is surfaced via tooltip.
 */
export function formatPreviousShort(previous: PreviousComparable, units?: string) {
  const loadText = typeof previous.load === 'number' ? `${formatNumber(previous.load)}${units ? ` ${units}` : ''}` : 'BW'
  const repsText = typeof previous.reps === 'number' ? String(previous.reps) : '—'
  return `${loadText} × ${repsText}`
}

export function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value)) return 0
  if (!step) return value
  return Math.round(value / step) * step
}

export function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

/**
 * The RIR to show/commit for a set row: a draft (just-tapped) value wins, then whatever is already
 * saved on the set, and only while the set is still open does the carried-over suggestion apply.
 * Reading the saved value is what keeps a completed set's chip from reverting to the empty default.
 */
export function resolveSetRir(input: {
  draftRir?: number
  savedRir?: number | null
  completed: boolean
  suggestedRir?: number
}): number | undefined {
  if (typeof input.draftRir === 'number') return input.draftRir
  if (typeof input.savedRir === 'number') return input.savedRir
  return input.completed ? undefined : input.suggestedRir
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
