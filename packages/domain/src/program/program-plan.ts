import { getMovementName } from '../movement/movements'
import type { PlannedSession } from '../session/types'
import { convertWeight } from '../shared/math'
import type { SessionHardness, Unit } from '../shared/types'
import { isReturnActive } from './return-settings'
import { expandSessionFromTemplateDefinition } from './template-engine'
import type { ProgramInstance, ProgramSessionStamp } from './types'
import { cycleDisplayIndex } from './cycle-boundary'

export type ProgramPlanTarget = {
  movementId: string
  movementName: string
  load: number | null
  source: 'saved' | 'preview' | 'mixed' | 'unavailable'
}

export type ProgramPlanSession = {
  globalIndex: number
  sessionNumber: number
  status: 'completed' | 'next' | 'upcoming' | 'unavailable'
  title: string
  saved: ProgramSessionStamp | null
  /** Current-reference preview only. Completed rows must open their saved recap. */
  preview: PlannedSession | null
  movementCount: number | null
  plannedSetCount: number | null
  completedSetCount: number | null
}

export type ProgramPlanWeek = {
  index: number
  number: number
  label: string
  phaseLabel: string
  summary: string
  hardness: SessionHardness
  status: 'past' | 'current' | 'future'
  sessionsDone: number
  sessionsTotal: number
  completedSetCount: number | null
  plannedSetCount: number | null
  targets: ProgramPlanTarget[]
  sessions: ProgramPlanSession[]
}

export type ProgramPlanModel = {
  currentWeekIndex: number
  currentSessionInWeek: number
  cycleStart: number
  totalWeeks: number
  daysPerWeek: number
  /** Position within this cycle, excluding any active/unstarted workout. */
  completedSessions: number
  totalSessions: number
  units: Unit
  lifts: Array<{ movementId: string; movementName: string }>
  weeks: ProgramPlanWeek[]
}

export type ProgramPlan = ProgramPlanModel

/**
 * Plan is ordered workouts, not a weekday calendar. Saved rows retain their facts;
 * every unstarted row uses current references, never hypothetical progression.
 */
export function buildProgramPlan({
  program,
  sessionStamps,
  scheduledDate,
}: {
  program: ProgramInstance
  sessionStamps: ProgramSessionStamp[]
  /** Account-local date used only to expand previews, not to schedule future sessions. */
  scheduledDate: string
}): ProgramPlanModel {
  const definition = program.templateDefinition
  if (!definition) throw new Error('Programme definition unavailable')
  const { daysPerWeek, durationWeeks: totalWeeks } = definition
  const cycleLength = daysPerWeek * totalWeeks
  if (cycleLength <= 0) throw new Error('Programme schedule unavailable')
  const cycleStart = Math.floor(cycleDisplayIndex(program) / cycleLength) * cycleLength
  const cyclePosition = program.currentWeekIndex - cycleStart
  const currentWeekIndex = Math.min(totalWeeks - 1, Math.floor(cyclePosition / daysPerWeek))
  const currentSessionInWeek = program.cycleBoundary ? daysPerWeek - 1 : cyclePosition % daysPerWeek
  // Overview history is newest first. Do not combine two workouts at the same position.
  const savedByIndex = new Map<number, ProgramSessionStamp>()
  for (const stamp of sessionStamps) {
    if (!savedByIndex.has(stamp.weekIndex)) savedByIndex.set(stamp.weekIndex, stamp)
  }

  const weeks = definition.weeks.map((week, index): ProgramPlanWeek => {
    const sessions = definition.sessions.slice(0, daysPerWeek).map((template, sessionIndex): ProgramPlanSession => {
      const globalIndex = cycleStart + index * daysPerWeek + sessionIndex
      const saved = savedByIndex.get(globalIndex) ?? null
      const past = globalIndex < program.currentWeekIndex
      const preview = !saved && !past
        ? expandSessionFromTemplateDefinition(previewProgram(program, globalIndex), definition, scheduledDate)
        : null
      return {
        globalIndex,
        sessionNumber: sessionIndex + 1,
        status: saved ? 'completed' : past ? 'unavailable' : globalIndex === program.currentWeekIndex ? 'next' : 'upcoming',
        title: saved?.title ?? preview?.title ?? template.title,
        saved,
        preview,
        movementCount: saved?.movementCount ?? preview?.movements.length ?? null,
        plannedSetCount: saved?.plannedSetCount ?? (preview ? preview.movements.reduce((sum, movement) => sum + movement.sets.length, 0) : null),
        completedSetCount: saved ? saved.completedSetCount ?? null : past ? null : 0,
      }
    })
    return {
      index,
      number: index + 1,
      label: week.label,
      phaseLabel: week.waveLabel ? `${week.phaseLabel} · ${week.waveLabel}` : week.phaseLabel,
      summary: week.summary,
      hardness: week.hardness,
      status: index < currentWeekIndex ? 'past' : index === currentWeekIndex ? 'current' : 'future',
      sessionsDone: sessions.filter((session) => session.saved || session.globalIndex < program.currentWeekIndex).length,
      sessionsTotal: sessions.length,
      completedSetCount: sumKnown(sessions.map((session) => session.completedSetCount)),
      plannedSetCount: sumKnown(sessions.map((session) => session.plannedSetCount)),
      targets: [],
      sessions,
    }
  })
  const movementIds = new Set<string>()
  // Current/future planned movements keep the table stable; historical replacements retain their own identity.
  for (const week of [...weeks.slice(currentWeekIndex), ...weeks.slice(0, currentWeekIndex)]) {
    for (const session of week.sessions) {
      for (const target of sessionTargets(session, program.units)) movementIds.add(target.movementId)
    }
  }
  const lifts = [...movementIds].map((movementId) => ({ movementId, movementName: getMovementName(movementId) }))
  for (const week of weeks) {
    const missingSavedFacts = week.sessions.some((session) => session.status === 'unavailable'
      || (session.saved && (!session.saved.mainTargets || !session.saved.units)))
    const targets = week.sessions.flatMap((session) => sessionTargets(session, program.units))
    week.targets = lifts.map((lift): ProgramPlanTarget => {
      const matching = targets.filter((target) => target.movementId === lift.movementId)
      const loaded = matching.filter((target): target is typeof target & { load: number } => target.load !== null)
      if (missingSavedFacts || !loaded.length) return { ...lift, load: null, source: 'unavailable' }
      const sources = new Set(matching.map((target) => target.source))
      return {
        ...lift,
        load: Math.max(...loaded.map((target) => target.load)),
        source: sources.size > 1 ? 'mixed' : loaded[0].source,
      }
    })
  }
  return {
    currentWeekIndex, currentSessionInWeek, cycleStart, totalWeeks, daysPerWeek,
    completedSessions: cyclePosition, totalSessions: cycleLength, units: program.units, lifts, weeks,
  }
}

function previewProgram(program: ProgramInstance, globalIndex: number): ProgramInstance {
  const period = program.returnPeriod
  if (!period || !isReturnActive(period)) return { ...program, currentWeekIndex: globalIndex }
  const completedWorkouts = period.completedWorkouts + Math.max(0, globalIndex - program.currentWeekIndex)
  const total = period.settings.stages.reduce((sum, stage) => sum + stage.workouts, 0)
  return {
    ...program,
    currentWeekIndex: globalIndex,
    returnPeriod: { ...period, completedWorkouts, status: completedWorkouts >= total ? 'review' : 'active' },
  }
}

function sumKnown(values: Array<number | null>) {
  return values.some((value) => value === null) ? null : values.reduce<number>((sum, value) => sum + value!, 0)
}

function sessionTargets(session: ProgramPlanSession, units: Unit): Array<{
  movementId: string
  load: number | null
  source: 'saved' | 'preview'
}> {
  if (session.saved) return (session.saved.mainTargets ?? []).map((target) => ({
    movementId: target.performedMovementId,
    load: target.targetLoad !== null && Number.isFinite(target.targetLoad) && target.targetLoad >= 0 && session.saved!.units
      ? convertWeight(target.targetLoad, session.saved!.units, units) : null,
    source: 'saved',
  }))
  return (session.preview?.movements ?? []).filter((movement) => movement.role === 'main').map((movement) => {
    const loads = movement.sets.map((set) => set.targetLoad).filter(
      (load): load is number => typeof load === 'number' && Number.isFinite(load) && load >= 0,
    )
    return { movementId: movement.performedMovementId ?? movement.movementId, load: loads.length ? Math.max(...loads) : null, source: 'preview' }
  })
}
