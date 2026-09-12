import { formatWeight, repsLeftLabel } from '@sheetless/domain/shared/set-notation'
import type { ExperienceMode } from '@sheetless/domain/account/types'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { externalLoadOrNull, isPositiveLoad } from '@sheetless/domain/shared/load'
import type { PlannedSession, PreviousComparable, SetLog } from '@sheetless/domain/session/types'
import type { MovementRole, Unit } from '@sheetless/domain/shared/types'

type PlannedMovements = Pick<PlannedSession, 'movements'>
type PlannedNumbers = Pick<PlannedSession, 'movements' | 'units'>

/**
 * Reading mode for the numbers on Today.
 *
 * Guided says how many reps you had left; Full says RIR and estimated maxes. The parameter
 * defaults to `full` so existing callers keep the phrasing they shipped with — the web Today
 * screen passes the account's actual mode, and native keeps the technical wording until its
 * own pass.
 */
type Notation = ExperienceMode

export function countPlannedSets(session: PlannedMovements): number {
  return session.movements.reduce((total, movement) => total + movement.sets.length, 0)
}

export function hasTargetLoads(session: PlannedMovements): boolean {
  return session.movements.some((movement) => movement.sets.some((set) => isPositiveLoad(set.targetLoad)))
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
function ledgerTarget(sets: SetLog[], units: string, mode: Notation): { label: string; isLoad: boolean } {
  const rawLoads = sets.map((set) => set.targetLoad).filter((load): load is number => load != null)
  const loads = rawLoads.filter(isPositiveLoad)
  if (loads.length) return { label: formatWeight(Math.max(...loads), units) ?? '—', isLoad: true }
  if (rawLoads.length) return { label: 'BW', isLoad: false }
  const rir = sets.find((set) => set.targetRir != null)?.targetRir
  if (rir != null) {
    const label = mode === 'guided' ? repsLeftLabel(rir) ?? `RIR ${rir}` : `RIR ${rir}`
    return { label, isLoad: false }
  }
  return { label: '—', isLoad: false }
}

export function buildTodayLedgerRows(session: PlannedNumbers, mode: Notation = 'full'): TodayLedgerRow[] {
  return session.movements.map((movement) => {
    const target = ledgerTarget(movement.sets, session.units, mode)
    return {
      slotId: movement.id,
      movementName: movement.movementName,
      role: movement.role,
      setsLabel: ledgerSetsLabel(movement.sets),
      targetLabel: target.label,
      targetIsLoad: target.isLoad,
      historyLine: formatPreviousLine(movement.previous, mode),
    }
  })
}

/** Collapsed teaser under the drawer title, e.g. "Day 2 target loads" — no totals by design. */
export function buildTodayLedgerCaption(session: Pick<PlannedSession, 'title' | 'movements'>): string {
  return hasTargetLoads(session) ? `${session.title} target loads` : `${session.title} targets`
}

/** Unitless ledger history line: "107.5 × 6 @ RIR 3" (Full) or "107.5 × 6 · ~3 left" (Guided). */
export function formatPreviousLine(
  previous?: PreviousComparable | null,
  mode: Notation = 'full',
): string | null {
  if (!previous || (previous.load == null && previous.reps == null)) return null
  const externalLoad = externalLoadOrNull(previous.load)
  const load = externalLoad == null ? 'BW' : formatWeight(externalLoad)
  const base = previous.reps != null ? `${load} × ${previous.reps}` : load
  if (previous.rir == null) return base
  if (mode === 'guided') {
    const left = repsLeftLabel(previous.rir)
    return left ? `${base} · ${left}` : base
  }
  return `${base} @ RIR ${previous.rir}`
}

/**
 * Hero comparable line.
 *
 * Full: "Previous comparable · 107.5 kg × 6 @ RIR 3 · e1RM 140 kg · Jul 3".
 * Guided: "Last time · 107.5 kg × 6 · ~3 left · Jul 3" — no jargon, no estimated max.
 */
export function formatPreviousHero(
  previous: PreviousComparable | null | undefined,
  units: Unit | string,
  mode: Notation = 'full',
): string | null {
  if (!previous || (previous.load == null && previous.reps == null)) return null
  const guided = mode === 'guided'
  const externalLoad = externalLoadOrNull(previous.load)
  const load = externalLoad == null ? 'BW' : formatWeight(externalLoad, units)
  const base = previous.reps != null ? `${load} × ${previous.reps}` : load
  const effort = previous.rir == null
    ? ''
    : guided
      ? `${repsLeftLabel(previous.rir) ? ` · ${repsLeftLabel(previous.rir)}` : ''}`
      : ` @ RIR ${previous.rir}`
  const parts = [`${guided ? 'Last time' : 'Previous comparable'} · ${base}${effort}`]
  if (!guided && externalLoad != null && isPositiveLoad(previous.e1rm)) {
    parts.push(`e1RM ${formatWeight(previous.e1rm, units)}`)
  }
  const workoutDate = previous.workoutDate ?? previous.performedAt
  if (workoutDate) parts.push(formatCompactDate(workoutDate))
  return parts.join(' · ')
}

/**
 * The line under the session title.
 *
 * Guided: "6 movements · about 75 min". Full adds the set count and drops the softener:
 * "6 movements · 23 sets · ~75 min".
 */
export function buildTodaySessionMeta(
  session: PlannedMovements & { estimatedMinutes?: number | null },
  mode: Notation = 'full',
): string {
  const movements = session.movements.length
  const parts = [`${movements} ${movements === 1 ? 'movement' : 'movements'}`]
  if (mode !== 'guided') {
    const sets = countPlannedSets(session)
    if (sets > 0) parts.push(`${sets} ${sets === 1 ? 'set' : 'sets'}`)
  }
  if (session.estimatedMinutes != null) {
    parts.push(mode === 'guided' ? `about ${session.estimatedMinutes} min` : `~${session.estimatedMinutes} min`)
  }
  return parts.join(' · ')
}
