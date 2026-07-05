import { formatWeight } from '~/shared/lib/set-notation'
import { formatCompactDate } from '~/shared/lib/dates'
import type { MovementRole, PlannedSession, PreviousComparable, SetLog, Unit } from '~/shared/types'

type PlannedMovements = Pick<PlannedSession, 'movements'>
type PlannedNumbers = Pick<PlannedSession, 'movements' | 'units'>

export function countPlannedSets(session: PlannedMovements): number {
  return session.movements.reduce((total, movement) => total + movement.sets.length, 0)
}

export function hasTargetLoads(session: PlannedMovements): boolean {
  return session.movements.some((movement) => movement.sets.some((set) => set.targetLoad != null))
}

/** One movement's row in the "Today's workout" sheet ledger (Exercise / Sets / Target columns). */
export type TodayLedgerRow = {
  slotId: string
  movementName: string
  role: MovementRole
  /** "5 × 5", "3 × 6–10", "8 sets" when sets differ, "—" when empty. */
  setsLabel: string
  /** "112.5 kg" (top/working set), "RIR 2" when no load is projected, else "—". */
  targetLabel: string
  /** True → the target is a load (bold styling); false → effort cue / unknown (dimmed). */
  targetIsLoad: boolean
  /** "107.5 × 6 @ RIR 3" — unitless last-performance line; null when nothing comparable. */
  historyLine: string | null
}

/** Reps label for the ledger's Sets column; en-dash ranges, AMRAP renders "5+" (or "AMRAP"). */
function ledgerRepsLabel(set: SetLog): string | null {
  const core =
    set.targetReps != null
      ? String(set.targetReps)
      : set.targetRepMin != null && set.targetRepMax != null
        ? `${set.targetRepMin}–${set.targetRepMax}`
        : set.targetRepMin != null
          ? String(set.targetRepMin)
          : null
  if (set.isAmrap) return core ? `${core}+` : 'AMRAP'
  return core
}

function ledgerSetsLabel(sets: SetLog[]): string {
  if (!sets.length) return '—'
  const labels = sets.map(ledgerRepsLabel)
  const first = labels[0]
  if (first != null && labels.every((label) => label === first)) return `${sets.length} × ${first}`
  return `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}`
}

/** Target cell: the top/working-set load when projected (handles waves), else the RIR cue. */
function ledgerTarget(sets: SetLog[], units: string): { label: string; isLoad: boolean } {
  const loads = sets.map((set) => set.targetLoad).filter((load): load is number => load != null)
  if (loads.length) return { label: formatWeight(Math.max(...loads), units) ?? '—', isLoad: true }
  const rir = sets.find((set) => set.targetRir != null)?.targetRir
  if (rir != null) return { label: `RIR ${rir}`, isLoad: false }
  return { label: '—', isLoad: false }
}

export function buildTodayLedgerRows(session: PlannedNumbers): TodayLedgerRow[] {
  return session.movements.map((movement) => {
    const target = ledgerTarget(movement.sets, session.units)
    return {
      slotId: movement.id,
      movementName: movement.movementName,
      role: movement.role,
      setsLabel: ledgerSetsLabel(movement.sets),
      targetLabel: target.label,
      targetIsLoad: target.isLoad,
      historyLine: formatPreviousLine(movement.previous),
    }
  })
}

/** Collapsed teaser under the drawer title, e.g. "Day 2 target loads" — no totals by design. */
export function buildTodayLedgerCaption(session: Pick<PlannedSession, 'title' | 'movements'>): string {
  return hasTargetLoads(session) ? `${session.title} target loads` : `${session.title} targets`
}

/** Unitless ledger history line: "107.5 × 6 @ RIR 3", "BW × 8"; null when nothing comparable. */
export function formatPreviousLine(previous?: PreviousComparable | null): string | null {
  if (!previous || (previous.load == null && previous.reps == null)) return null
  const load = previous.load != null ? formatWeight(previous.load) : 'BW'
  const base = previous.reps != null ? `${load} × ${previous.reps}` : load
  return previous.rir != null ? `${base} @ RIR ${previous.rir}` : base
}

/** Hero last-performance line: "Last 107.5 kg × 6 @ RIR 3 · e1RM 140 kg · Jul 3" — parts omitted when unknown. */
export function formatPreviousHero(previous: PreviousComparable | null | undefined, units: Unit | string): string | null {
  if (!previous || (previous.load == null && previous.reps == null)) return null
  const load = previous.load != null ? formatWeight(previous.load, units) : 'BW'
  const base = previous.reps != null ? `${load} × ${previous.reps}` : load
  const parts = [`Last ${base}${previous.rir != null ? ` @ RIR ${previous.rir}` : ''}`]
  if (previous.e1rm != null) parts.push(`e1RM ${formatWeight(previous.e1rm, units)}`)
  if (previous.performedAt) parts.push(formatCompactDate(previous.performedAt))
  return parts.join(' · ')
}
