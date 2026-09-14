import { formatNumber, formatWeight, repsLeftLabel } from '@sheetless/domain/shared/set-notation'
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

/** One movement's row in the Today session card. */
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
  /**
   * What the row prescribes. Full prints the authored notation ("75%x5 · 85%x3 · 95%x1+ ·
   * back-off 5x5"); Guided prints the sets label, which stays free of percentages.
   */
  prescriptionLabel: string
  /**
   * Every distinct working load the row ramps through — "145 · 162.5 · 182.5 kg". Collapses to
   * the single load when the row does not ramp, and to the effort cue when nothing is projected.
   * Back-off sets are excluded; the notation names them instead.
   */
  loadsLabel: string
  /** Guided only: "up 2.5 kg — you got every rep last time". Null when nothing honest to say. */
  reason: string | null
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

/**
 * Every distinct working load the row ramps through, e.g. "145 · 162.5 · 182.5 kg".
 *
 * Back-off sets are dropped: the comp shows the ramp, and the notation names the back-off
 * separately. Uses `formatWeight` like the trace panel does, so the row and the trace can never
 * disagree about a number.
 */
function ledgerLoads(sets: SetLog[], units: string, fallback: string): string {
  const working = sets.filter((set) => !set.isBackoff)
  const loads: number[] = []
  for (const set of working) {
    const load = set.targetLoad
    if (!isPositiveLoad(load)) continue
    if (!loads.includes(load)) loads.push(load)
  }
  if (!loads.length) return fallback
  const units_ = units ? ` ${units}` : ''
  return `${loads.map((load) => formatNumber(load)).join(' · ')}${units_}`
}

export type TodayRowOptions = {
  mode?: Notation
  /**
   * The most recent accepted progression per state key, already turned into a sentence. Rows join
   * to it through `set.sourceBinding.stateKey` — the only link the schema records between a
   * planned row and the decision that moved its load.
   */
  reasonByStateKey?: Record<string, string>
}

export function buildTodayLedgerRows(
  session: PlannedNumbers & { returnContext?: PlannedSession['returnContext'] },
  modeOrOptions: Notation | TodayRowOptions = 'full',
): TodayLedgerRow[] {
  const options: TodayRowOptions =
    typeof modeOrOptions === 'string' ? { mode: modeOrOptions } : modeOrOptions
  const mode = options.mode ?? 'full'
  const reasonByStateKey = options.reasonByStateKey ?? {}

  return session.movements.map((movement) => {
    const target = ledgerTarget(movement.sets, session.units, mode)
    const setsLabel = ledgerSetsLabel(movement.sets)
    // `movement.id` and `movement.slotId` are both `slot-<session>-<slot>` after template
    // expansion; the trace inspector looks the row up by `slotId ?? id`, so they must agree.
    const stateKey = movement.sets.find((set) => set.sourceBinding?.stateKey)?.sourceBinding?.stateKey
    return {
      slotId: movement.id,
      movementName: movement.movementName,
      role: movement.role,
      setsLabel,
      targetLabel: target.label,
      targetIsLoad: target.isLoad,
      historyLine: formatPreviousLine(movement.previous, mode),
      // Guided normally says "5 × 5" rather than the authored notation — but a return-period
      // session rewrites targetSummary to "3 of 5 sets · lighter", which is the whole point of
      // the reduced volume and must not be swallowed.
      prescriptionLabel:
        mode === 'guided' && !session.returnContext
          ? setsLabel
          : movement.targetSummary || setsLabel,
      loadsLabel: ledgerLoads(movement.sets, session.units, target.label),
      reason: mode === 'guided' && stateKey ? reasonByStateKey[stateKey] ?? null : null,
    }
  })
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
 * "6 movements · 23 sets · ~75 min". Both gain a "free weights" tail when the programme is in
 * free-weight mode — `standard` is the default and stays unsaid, exactly as `EquipmentModeBadge`
 * treats it.
 */
export function buildTodaySessionMeta(
  session: PlannedMovements & {
    estimatedMinutes?: number | null
    equipmentMode?: PlannedSession['equipmentMode']
  },
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
  if (session.equipmentMode === 'free_weight') parts.push('free weights')
  return parts.join(' · ')
}
