import type { ProgramSessionStamp, ProgramStateOverview, ProgressionDecision, Unit } from '~/shared/types'
import { getMovementName } from '~/domains/movement/lib/movements'
import { mround } from '~/shared/lib/math'
import {
  programStateKey,
  type TemplateDefinition,
  type TemplateSetDefinition,
} from '~/domains/program/lib/template-engine'

/**
 * Program trajectory — the "full timeline" model behind the Your Plan page.
 *
 * Groups the template weeks into phases and computes, per week, the top-set
 * targets for the main lifts. Past values are reconstructed from accepted
 * progression decisions where possible; future weeks assume standard
 * progression each time a lift's progression rule fires ("if targets hit"),
 * so they are a trajectory, not a promise.
 */

export type TrajectoryLiftTarget = {
  movementId: string
  label: string
  load: number
}

export type TrajectoryWeekStatus = 'done' | 'current' | 'upcoming'

export type TrajectoryWeek = {
  /** 0-based programme week index. */
  index: number
  /** 1-based week number. */
  number: number
  status: TrajectoryWeekStatus
  sessionsDone: number
  sessionsTotal: number
  targets: TrajectoryLiftTarget[]
  /** True when the targets assume future progression ("if targets hit"). */
  isProjected: boolean
}

export type TrajectoryValuePill = {
  movementId: string
  label: string
  value: number
}

export type TrajectoryPhase = {
  key: string
  label: string
  range: string
  subtitle: string
  status: TrajectoryWeekStatus
  description?: string | null
  weeks: TrajectoryWeek[]
  /** Training maxes locked in by the end of a completed phase. */
  banked?: { atWeekNumber: number; values: TrajectoryValuePill[] }
  /** Last-week top-set targets if every progression lands. */
  projected?: { byWeekNumber: number; values: TrajectoryValuePill[] }
}

export type ProgramTrajectory = {
  totalWeeks: number
  currentWeekNumber: number
  phases: TrajectoryPhase[]
  hasTargets: boolean
}

const PROGRESSING_RULE_IDS = new Set([
  'plus_set_wave',
  'bullmastiff_plus_set',
  'training_max_band',
  'healthy_531_tm_band',
  'simple_linear_completion',
])

const UPPER_BODY_MOVEMENTS = new Set(['bench_press', 'overhead_press', 'barbell_row'])

const SHORT_LIFT_LABELS: Record<string, string> = {
  squat: 'Squat',
  bench_press: 'Bench',
  deadlift: 'Dead',
  overhead_press: 'OHP',
  barbell_row: 'Row',
}

export function shortLiftLabel(movementId: string) {
  return SHORT_LIFT_LABELS[movementId] ?? getMovementName(movementId)
}

type TopSetRef = {
  movementId: string
  stateKey: string
  set: TemplateSetDefinition
  progresses: boolean
}

function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo
}

function cleanPhaseLabel(label: string) {
  return label.replace(/\s+phase$/i, '')
}

function titleize(key: string) {
  const words = key.replaceAll(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function resolveSlotMovementId(
  movementId: string | { default: string; byPhase?: Record<string, string> },
  phaseKey: string,
) {
  if (typeof movementId === 'string') return movementId
  return movementId.byPhase?.[phaseKey] ?? movementId.default
}

/** The heaviest planned main set of a prescription that we can price from programme state. */
function findTopSet(sets: TemplateSetDefinition[]): TemplateSetDefinition | null {
  const priceable = sets.filter(
    (set) => set.targetLoad?.kind === 'percent_of_state' || set.targetLoad?.kind === 'state',
  )
  if (!priceable.length) return null
  const flagged = priceable.find((set) => set.isTopSet)
  if (flagged) return flagged
  return priceable.reduce((top, set) => {
    const topPercent = top.targetLoad?.kind === 'percent_of_state' ? top.targetLoad.percent : 1
    const setPercent = set.targetLoad?.kind === 'percent_of_state' ? set.targetLoad.percent : 1
    return setPercent > topPercent ? set : top
  })
}

/** Main-lift top sets for a programme week, one per movement (heaviest wins). */
function weekTopSets(definition: TemplateDefinition, weekIndex: number): TopSetRef[] {
  const week = definition.weeks[weekIndex]
  if (!week) return []
  const byMovement = new Map<string, TopSetRef>()
  for (const session of definition.sessions) {
    for (const slot of session.slots) {
      if (slot.role !== 'main') continue
      const prescription = week.prescriptions[slot.prescriptionId]
      if (!prescription) continue
      const set = findTopSet(prescription.sets)
      if (!set?.targetLoad) continue
      const load = set.targetLoad
      if (load.kind !== 'percent_of_state' && load.kind !== 'state') continue
      if (load.kind === 'percent_of_state' && load.default === 'blank') continue
      const movementId = resolveSlotMovementId(slot.movementId, week.phaseKey)
      const anchorId = load.kind === 'percent_of_state' ? slot.anchorMovementId ?? movementId : movementId
      const stateKey = load.stateKey ?? programStateKey(anchorId, load.stateType)
      const ref: TopSetRef = {
        movementId,
        stateKey,
        set,
        progresses: PROGRESSING_RULE_IDS.has(prescription.progressionRuleId ?? ''),
      }
      const existing = byMovement.get(movementId)
      if (!existing || percentOf(ref.set) > percentOf(existing.set)) byMovement.set(movementId, ref)
      else if (ref.progresses && !existing.progresses) existing.progresses = true
    }
  }
  return Array.from(byMovement.values())
}

function percentOf(set: TemplateSetDefinition) {
  const load = set.targetLoad
  if (load?.kind !== 'percent_of_state') return 1
  return load.default === 'high' && load.percentMax ? load.percentMax : load.percent
}

/** Standard "targets hit" increment for one progression event on a state. */
function incrementFor(
  definition: TemplateDefinition,
  movementId: string,
  units: Unit,
): number {
  const configured = definition.progressionConfig?.simple_linear_completion?.increments[movementId]
  if (configured) return configured[units]
  return UPPER_BODY_MOVEMENTS.has(movementId) ? 2.5 : 5
}

/**
 * Progression events for a state between two global session indices
 * [fromGlobal, toGlobalExclusive) — each main-lift top set governed by a
 * progressing rule counts as one "targets hit" bump.
 */
function progressionEventsBetween(
  definition: TemplateDefinition,
  stateKey: string,
  fromGlobal: number,
  toGlobalExclusive: number,
) {
  let events = 0
  const totalSessions = definition.daysPerWeek * definition.durationWeeks
  const to = Math.min(toGlobalExclusive, totalSessions)
  for (let globalIndex = Math.max(fromGlobal, 0); globalIndex < to; globalIndex += 1) {
    const weekIndex = Math.floor(globalIndex / definition.daysPerWeek) % definition.durationWeeks
    const sessionIndex = globalIndex % definition.daysPerWeek
    const week = definition.weeks[weekIndex]
    const session = definition.sessions[sessionIndex]
    if (!week || !session) continue
    for (const slot of session.slots) {
      if (slot.role !== 'main') continue
      const prescription = week.prescriptions[slot.prescriptionId]
      if (!prescription || !PROGRESSING_RULE_IDS.has(prescription.progressionRuleId ?? '')) continue
      const set = findTopSet(prescription.sets)
      const load = set?.targetLoad
      if (!load || (load.kind !== 'percent_of_state' && load.kind !== 'state')) continue
      const movementId = resolveSlotMovementId(slot.movementId, week.phaseKey)
      const anchorId = load.kind === 'percent_of_state' ? slot.anchorMovementId ?? movementId : movementId
      const key = load.stateKey ?? programStateKey(anchorId, load.stateType)
      if (key === stateKey) events += 1
    }
  }
  return events
}

type StateHistory = {
  current: number
  /** Accepted decisions for this state, oldest first. */
  changes: Array<{ resolvedAt: string | null; previousValue: number | null; recommendedValue: number | null }>
}

function buildStateHistories(
  stateValues: ProgramStateOverview[],
  acceptedDecisions: ProgressionDecision[],
) {
  const histories = new Map<string, StateHistory>()
  for (const state of stateValues) {
    const changes = acceptedDecisions
      .filter((decision) => decision.stateKey === state.stateKey)
      .map((decision) => ({
        resolvedAt: decision.resolvedAt ?? null,
        previousValue: decision.previousValue ?? null,
        recommendedValue: decision.recommendedValue ?? null,
      }))
      .reverse()
    histories.set(state.stateKey, { current: state.value, changes })
  }
  return histories
}

/**
 * Value the state held at a moment in time, replayed from accepted decisions.
 * Decisions without a resolvedAt (or when boundary is null) fall back to the
 * current value — best effort by design.
 */
function stateValueAt(history: StateHistory | undefined, boundary: string | null): number | null {
  if (!history) return null
  const boundaryTime = boundary ? Date.parse(boundary) : Number.NaN
  if (!Number.isFinite(boundaryTime)) return history.current
  let value: number | null = null
  for (const change of history.changes) {
    const changeTime = change.resolvedAt ? Date.parse(change.resolvedAt) : Number.NaN
    if (!Number.isFinite(changeTime)) continue
    if (changeTime < boundaryTime) {
      value = change.recommendedValue ?? value
    } else {
      // First change on/after the boundary: the state held its previous value.
      if (value === null) value = change.previousValue ?? null
      break
    }
  }
  if (value === null) {
    // No changes recorded before the boundary — the earliest known value wins.
    const earliest = history.changes.find((change) => change.previousValue !== null)
    return earliest?.previousValue ?? history.current
  }
  return value
}

export function buildProgramTrajectory({
  definition,
  currentGlobalIndex,
  rounding,
  units,
  stateValues,
  acceptedDecisions,
  sessionStamps,
}: {
  definition: TemplateDefinition
  /** Global session index — `program.currentWeekIndex`. */
  currentGlobalIndex: number
  rounding: number
  units: Unit
  stateValues: ProgramStateOverview[]
  acceptedDecisions: ProgressionDecision[]
  sessionStamps: ProgramSessionStamp[]
}): ProgramTrajectory {
  const daysPerWeek = definition.daysPerWeek
  const totalWeeks = definition.durationWeeks
  const totalSessions = daysPerWeek * totalWeeks
  const effectiveGlobal = positiveModulo(currentGlobalIndex, totalSessions)
  const currentWeekIndex = Math.floor(effectiveGlobal / daysPerWeek)
  const histories = buildStateHistories(stateValues, acceptedDecisions)

  // Last completion time per programme week, for attributing decisions to phases.
  const lastCompletedByWeek = new Map<number, string>()
  const firstCompletedByWeek = new Map<number, string>()
  for (const stamp of sessionStamps) {
    const weekIndex = Math.floor(positiveModulo(stamp.weekIndex, totalSessions) / daysPerWeek)
    const stampTime = Date.parse(stamp.completedAt)
    if (!Number.isFinite(stampTime)) continue
    const last = lastCompletedByWeek.get(weekIndex)
    if (!last || stampTime > Date.parse(last)) lastCompletedByWeek.set(weekIndex, stamp.completedAt)
    const first = firstCompletedByWeek.get(weekIndex)
    if (!first || stampTime < Date.parse(first)) firstCompletedByWeek.set(weekIndex, stamp.completedAt)
  }

  const stateAtWeek = (stateKey: string, weekIndex: number): number | null => {
    const history = histories.get(stateKey)
    if (!history) return null
    if (weekIndex === currentWeekIndex) return history.current
    if (weekIndex > currentWeekIndex) {
      // "If targets hit": add one standard increment per remaining progression event
      // that lands before the week starts.
      const state = stateValues.find((item) => item.stateKey === stateKey)
      if (!state) return null
      const events = progressionEventsBetween(definition, stateKey, effectiveGlobal, weekIndex * daysPerWeek)
      if (!events) return history.current
      return mround(history.current + events * incrementFor(definition, state.movementId, units), rounding)
    }
    // Past week: value in effect when the week started.
    return stateValueAt(history, firstCompletedByWeek.get(weekIndex) ?? null)
  }

  const weeks: TrajectoryWeek[] = definition.weeks.map((week, weekIndex) => {
    const status: TrajectoryWeekStatus =
      weekIndex < currentWeekIndex ? 'done' : weekIndex === currentWeekIndex ? 'current' : 'upcoming'
    const sessionsDone = Math.max(0, Math.min(daysPerWeek, effectiveGlobal - weekIndex * daysPerWeek))
    const targets: TrajectoryLiftTarget[] = []
    for (const ref of weekTopSets(definition, weekIndex)) {
      const value = stateAtWeek(ref.stateKey, weekIndex)
      if (value === null || !Number.isFinite(value) || value <= 0) continue
      const load =
        ref.set.targetLoad?.kind === 'percent_of_state'
          ? mround(value * percentOf(ref.set), rounding)
          : value
      targets.push({ movementId: ref.movementId, label: shortLiftLabel(ref.movementId), load })
    }
    return {
      index: weekIndex,
      number: weekIndex + 1,
      status,
      sessionsDone,
      sessionsTotal: daysPerWeek,
      targets,
      isProjected: status === 'upcoming',
    }
  })

  // Group contiguous weeks by phaseKey, mirroring the phase map.
  const phases: TrajectoryPhase[] = []
  for (const week of weeks) {
    const templateWeek = definition.weeks[week.index]!
    const last = phases[phases.length - 1]
    if (last && last.key === templateWeek.phaseKey) {
      last.weeks.push(week)
      // Labels can vary per week inside one phaseKey (e.g. "5s week" / "3s week");
      // fall back to a titleized key so the header stays phase-level.
      if (last.label !== cleanPhaseLabel(templateWeek.phaseLabel)) last.label = titleize(templateWeek.phaseKey)
    } else {
      phases.push({
        key: templateWeek.phaseKey,
        label: cleanPhaseLabel(templateWeek.phaseLabel),
        range: '',
        subtitle: '',
        status: 'upcoming',
        description: null,
        weeks: [week],
      })
    }
  }

  const currentWeekNumber = currentWeekIndex + 1
  for (const phase of phases) {
    const first = phase.weeks[0]!
    const lastWeek = phase.weeks[phase.weeks.length - 1]!
    phase.range = first.number === lastWeek.number ? `Wk ${first.number}` : `Wk ${first.number}–${lastWeek.number}`
    phase.status =
      lastWeek.index < currentWeekIndex ? 'done' : first.index > currentWeekIndex ? 'upcoming' : 'current'

    const phaseSessionTotal = phase.weeks.length * daysPerWeek
    if (phase.status === 'done') {
      const done = phase.weeks.reduce((total, week) => total + week.sessionsDone, 0)
      phase.subtitle = `${phase.range} · completed, ${done}/${phaseSessionTotal} sessions`
    } else if (phase.status === 'current') {
      const weekInPhase = currentWeekIndex - first.index + 1
      phase.subtitle = `${phase.range} · week ${weekInPhase} of ${phase.weeks.length}`
    } else {
      const weeksAway = first.number - currentWeekNumber
      phase.subtitle = `${phase.range} · starts in ${weeksAway} ${weeksAway === 1 ? 'week' : 'weeks'}`
    }

    const anchorWeek =
      phase.status === 'current'
        ? definition.weeks[currentWeekIndex]
        : definition.weeks[first.index]
    phase.description = anchorWeek?.focus ?? anchorWeek?.summary ?? null

    if (phase.status === 'done') {
      // Training maxes in effect at the end of the phase (before any progressions
      // earned in its final session, which land in the next phase).
      const boundary = lastCompletedByWeek.get(lastWeek.index) ?? null
      const values: TrajectoryValuePill[] = []
      for (const ref of weekTopSets(definition, lastWeek.index)) {
        const value = stateValueAt(histories.get(ref.stateKey), boundary)
        if (value === null || !Number.isFinite(value) || value <= 0) continue
        values.push({ movementId: ref.movementId, label: shortLiftLabel(ref.movementId), value })
      }
      if (values.length) phase.banked = { atWeekNumber: lastWeek.number, values }
    } else if (lastWeek.targets.length) {
      phase.projected = {
        byWeekNumber: lastWeek.number,
        values: lastWeek.targets.map((target) => ({
          movementId: target.movementId,
          label: target.label,
          value: target.load,
        })),
      }
    }
  }

  return {
    totalWeeks,
    currentWeekNumber,
    phases,
    hasTargets: weeks.some((week) => week.targets.length > 0),
  }
}
