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

/**
 * Per-row "last time" ghost, e.g. "last 80 × 8" — what this exact set position got last
 * session. Unitless on purpose (the movement header's chip carries units); null when the
 * comparable has no matching set (older snapshots, added sets, or no history at all).
 */
export function previousSetShort(previous: PreviousComparable | null | undefined, setIndex: number): string | null {
  const match = previous?.sets?.find((set) => set.setIndex === setIndex)
  if (!match || typeof match.reps !== 'number' || match.reps <= 0) return null
  const loadText = typeof match.load === 'number' && match.load > 0 ? formatNumber(match.load) : 'BW'
  return `last ${loadText} × ${match.reps}`
}

export function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value)) return 0
  if (!step) return value
  return Math.round(value / step) * step
}

/**
 * Select the whole value when a logger number input gains focus, so the first keystroke replaces
 * the seeded value instead of appending to it ("0" + "5" → "05"). Mobile Safari undoes a select()
 * made during the focus event, so re-select on the next frame — but only while the value is
 * untouched, otherwise a fast first keystroke would get selected and eaten by the second.
 */
export function selectAllOnFocus(event: { currentTarget: HTMLInputElement }) {
  const input = event.currentTarget
  const initialValue = input.value
  input.select()
  requestAnimationFrame(() => {
    if (document.activeElement === input && input.value === initialValue) input.select()
  })
}

function isPositiveLoad(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/**
 * Weight to pre-fill for a set: a logged value wins, then the prescribed target. Sets without a
 * prescribed load (user-selected accessories) carry the nearest earlier completed set's weight,
 * falling back to last session's comparable — so straight sets only need the weight entered once.
 */
export function seedLoadForSet(movement: MovementSlot, set: SetLog): number {
  if (set.actualLoad != null) return set.actualLoad
  if (set.targetLoad != null) return set.targetLoad
  let carried: number | null = null
  let carriedIndex = -1
  for (const other of movement.sets) {
    if (other.setIndex >= set.setIndex || !other.completed || !isPositiveLoad(other.actualLoad)) continue
    if (other.setIndex > carriedIndex) {
      carried = other.actualLoad
      carriedIndex = other.setIndex
    }
  }
  if (carried != null) return carried
  const previousLoad = movement.previous?.load
  return isPositiveLoad(previousLoad) ? previousLoad : 0
}

function isPositiveReps(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/**
 * Reps to pre-fill for a set, mirroring seedLoadForSet: logged value, then the prescribed target,
 * then the nearest earlier completed set, then last session's comparable. Matters for ad-hoc
 * exercises, which have no rep targets at all.
 */
export function seedRepsForSet(movement: MovementSlot, set: SetLog): number {
  if (set.actualReps != null) return set.actualReps
  if (set.targetReps != null) return set.targetReps
  if (set.targetRepMin != null) return set.targetRepMin
  let carried: number | null = null
  let carriedIndex = -1
  for (const other of movement.sets) {
    if (other.setIndex >= set.setIndex || !other.completed || !isPositiveReps(other.actualReps)) continue
    if (other.setIndex > carriedIndex) {
      carried = other.actualReps
      carriedIndex = other.setIndex
    }
  }
  if (carried != null) return carried
  const previousReps = movement.previous?.reps
  return isPositiveReps(previousReps) ? previousReps : 0
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
