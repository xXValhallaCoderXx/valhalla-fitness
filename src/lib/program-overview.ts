import type {
  BodyLoadSummary,
  ProgramAccessoryPlan,
  ProgramAnchorOverview,
  ProgramInstance,
  ProgramOverview,
  ProgramRecentSessionSummary,
  ProgressionDecision,
  TodayPayload,
} from '~/types/training'
import { getMovementName } from './movements'
import { buildProgramTimeline } from './program-timeline'
import { expandPlannedSession } from './templates'

export function buildProgramOverview({
  today,
  recentSessions,
  bodyLoad,
  acceptedDecisions,
}: {
  today: TodayPayload
  recentSessions: ProgramRecentSessionSummary[]
  bodyLoad: BodyLoadSummary
  acceptedDecisions: ProgressionDecision[]
}): ProgramOverview {
  const program = today.activeProgram
  if (!program || !program.templateDefinition || !today.plannedSession) {
    return {
      activeProgram: program,
      position: null,
      nextSession: null,
      recentSessions,
      anchors: [],
      accessoryPlan: [],
      bodyLoad,
      pendingDecisions: today.pendingDecisions,
    }
  }

  const definition = program.templateDefinition
  const timeline = buildProgramTimeline(program, definition)
  const programmeWeekIndex = positiveModulo(Math.floor(program.currentWeekIndex / definition.daysPerWeek), definition.durationWeeks)
  const currentSessionInWeek = positiveModulo(program.currentWeekIndex, definition.daysPerWeek)
  const week = definition.weeks[programmeWeekIndex]
  const mainMovement = today.plannedSession.movements.find((movement) => movement.role === 'main')
  const variationCount = today.plannedSession.movements.filter((movement) => movement.role === 'variation').length
  const accessoryCount = today.plannedSession.movements.filter((movement) => movement.role === 'accessory').length
  const activeSessionId = today.activeSession?.sessionId
  const completedSessionId = today.completedSession?.sessionId

  return {
    activeProgram: program,
    position: {
      phaseKey: week?.phaseKey ?? 'current',
      phaseLabel: week?.phaseLabel ?? 'Current phase',
      waveLabel: week?.waveLabel ?? null,
      weekLabel: today.plannedSession.weekLabel,
      weekSummary: week?.summary ?? timeline.weeks[timeline.currentWeekIndex]?.summary ?? 'Current training week.',
      focus: week?.focus ?? mainMovement?.targetSummary ?? 'Complete the planned session.',
      hardness: today.plannedSession.hardness,
      weekNumber: programmeWeekIndex + 1,
      totalWeeks: definition.durationWeeks,
      sessionNumber: currentSessionInWeek + 1,
      daysPerWeek: definition.daysPerWeek,
      progressPercent: Math.round(((program.currentWeekIndex + 1) / (definition.durationWeeks * definition.daysPerWeek)) * 100),
    },
    nextSession: {
      title: today.plannedSession.title,
      scheduledDate: today.plannedSession.scheduledDate,
      mainMovementName: mainMovement?.movementName ?? 'No main movement',
      keyPrescription: mainMovement?.targetSummary ?? today.plannedSession.movements[0]?.targetSummary ?? 'Planned work',
      variationCount,
      accessoryCount,
      status: today.activeSession ? 'in_progress' : today.completedSession ? 'completed' : 'planned',
      href: activeSessionId
        ? `/sessions/${activeSessionId}`
        : completedSessionId
          ? `/sessions/${completedSessionId}/summary`
          : '/today',
    },
    recentSessions,
    anchors: buildAnchorOverview(program, today.pendingDecisions, acceptedDecisions),
    accessoryPlan: buildAccessoryPlan(program),
    bodyLoad,
    pendingDecisions: today.pendingDecisions,
  }
}

function buildAnchorOverview(
  program: ProgramInstance,
  pendingDecisions: ProgressionDecision[],
  acceptedDecisions: ProgressionDecision[],
): ProgramAnchorOverview[] {
  return program.anchors.map((anchor): ProgramAnchorOverview => ({
    movementId: anchor.movementId,
    movementName: getMovementName(anchor.movementId),
    value: anchor.value,
    units: program.units,
    pendingDecision: pendingDecisions.find((decision) => decision.movementId === anchor.movementId) ?? null,
    lastAcceptedDecision: acceptedDecisions.find((decision) => decision.movementId === anchor.movementId) ?? null,
  }))
}

function buildAccessoryPlan(program: ProgramInstance): ProgramAccessoryPlan[] {
  const definition = program.templateDefinition
  if (!definition) return []
  const programmeWeekIndex = positiveModulo(Math.floor(program.currentWeekIndex / definition.daysPerWeek), definition.durationWeeks)
  const weekStartIndex = programmeWeekIndex * definition.daysPerWeek

  return definition.sessions.map((session, sessionIndex): ProgramAccessoryPlan => {
    const expanded = expandPlannedSession(
      { ...program, currentWeekIndex: weekStartIndex + sessionIndex },
      program.startDate,
      definition,
    )
    return {
      sessionTitle: expanded.title,
      slots: expanded.movements
        .filter((movement) => movement.role === 'accessory')
        .map((movement) => {
          const override = (program.movementOverrides ?? []).find(
            (item) =>
              item.slotId === (movement.slotId ?? movement.id) &&
              item.phaseKey === movement.phaseKey &&
              item.role === movement.role &&
              item.replacementMovementId === movement.movementId,
          )
          return {
            slotId: movement.slotId ?? movement.id,
            movementId: movement.movementId,
            movementName: movement.movementName,
            role: movement.role,
            targetSummary: movement.targetSummary,
            replacedMovementName: override ? getMovementName(override.originalMovementId) : null,
          }
        }),
    }
  })
}

function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo
}
