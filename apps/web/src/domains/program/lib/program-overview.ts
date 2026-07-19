import type {
  BodyLoadSummary,
  ProgramAccessoryPlan,
  ProgramInstance,
  ProgramOverview,
  ProgramRecentSessionSummary,
  ProgramSessionStamp,
  ProgramStateOverview,
  ProgressionDecision,
  TodayPayload,
} from '~/shared/types'
import { getMovementName } from '~/domains/movement/lib/movements'
import { buildProgramTimeline } from '~/domains/program/lib/program-timeline'
import { expandPlannedSession } from '~/domains/program/lib/templates'

export function buildProgramOverview({
  today,
  recentSessions,
  bodyLoad,
  acceptedDecisions,
  sessionStamps = [],
}: {
  today: TodayPayload
  recentSessions: ProgramRecentSessionSummary[]
  bodyLoad: BodyLoadSummary
  acceptedDecisions: ProgressionDecision[]
  sessionStamps?: ProgramSessionStamp[]
}): ProgramOverview {
  const program = today.activeProgram
  if (!program || !program.templateDefinition) {
    return {
      activeProgram: program,
      position: null,
      nextSession: null,
      recentSessions,
      stateValues: program ? buildStateOverview(program, today.pendingDecisions, acceptedDecisions) : [],
      accessoryPlan: program ? buildAccessoryPlan(program) : [],
      bodyLoad,
      pendingDecisions: today.pendingDecisions,
      acceptedDecisions,
      sessionStamps,
    }
  }

  const definition = program.templateDefinition
  const plannedSession = today.plannedSession ?? expandPlannedSession(program, program.startDate, definition)
  const timeline = buildProgramTimeline(program, definition)
  const programmeWeekIndex = positiveModulo(Math.floor(program.currentWeekIndex / definition.daysPerWeek), definition.durationWeeks)
  const currentSessionInWeek = positiveModulo(program.currentWeekIndex, definition.daysPerWeek)
  const week = definition.weeks[programmeWeekIndex]
  const mainMovement = plannedSession.movements.find((movement) => movement.role === 'main')
  const nextSessionMovements = plannedSession.movements.map((movement) => ({
    role: movement.role,
    movementName: movement.movementName,
    targetSummary: movement.targetSummary,
  }))
  const mainCount = nextSessionMovements.filter((movement) => movement.role === 'main').length
  const variationCount = plannedSession.movements.filter((movement) => movement.role === 'variation').length
  const accessoryCount = plannedSession.movements.filter((movement) => movement.role === 'accessory').length
  // A live ad-hoc session is not the plan's session — it must not mark the next workout
  // "in progress" or point its Resume link at the ad-hoc logger.
  const planActiveSession = today.activeSession && !today.activeSession.isAdHoc ? today.activeSession : null
  const activeSessionId = planActiveSession?.sessionId
  const completedSessionId = today.completedSession?.sessionId
  const completedPlannedSession = today.completedSession?.id === plannedSession.id
  const nextSessionStatus = planActiveSession ? 'in_progress' : completedPlannedSession ? 'completed' : 'planned'

  return {
    activeProgram: program,
    position: {
      phaseKey: week?.phaseKey ?? 'current',
      phaseLabel: week?.phaseLabel ?? 'Current phase',
      waveLabel: week?.waveLabel ?? null,
      weekLabel: plannedSession.weekLabel,
      weekSummary: week?.summary ?? timeline.weeks[timeline.currentWeekIndex]?.summary ?? 'Current training week.',
      focus: week?.focus ?? mainMovement?.targetSummary ?? 'Complete the planned session.',
      hardness: plannedSession.hardness,
      weekNumber: programmeWeekIndex + 1,
      totalWeeks: definition.durationWeeks,
      sessionNumber: currentSessionInWeek + 1,
      daysPerWeek: definition.daysPerWeek,
      progressPercent: Math.round(((program.currentWeekIndex + 1) / (definition.durationWeeks * definition.daysPerWeek)) * 100),
    },
    nextSession: {
      title: plannedSession.title,
      scheduledDate: plannedSession.scheduledDate,
      mainMovementName: mainMovement?.movementName ?? 'No main movement',
      movementSummary: nextSessionMovements.map((movement) => movement.movementName).join(', ') || 'No movements',
      keyPrescription: mainMovement?.targetSummary ?? plannedSession.movements[0]?.targetSummary ?? 'Planned work',
      movements: nextSessionMovements,
      mainCount,
      variationCount,
      accessoryCount,
      status: nextSessionStatus,
      href: activeSessionId
        ? `/sessions/${activeSessionId}`
        : completedPlannedSession && completedSessionId
          ? `/sessions/${completedSessionId}/summary`
          : '/today',
    },
    recentSessions,
    stateValues: buildStateOverview(program, today.pendingDecisions, acceptedDecisions),
    accessoryPlan: buildAccessoryPlan(program),
    bodyLoad,
    pendingDecisions: today.pendingDecisions,
    acceptedDecisions,
    sessionStamps,
  }
}

function buildStateOverview(
  program: ProgramInstance,
  pendingDecisions: ProgressionDecision[],
  acceptedDecisions: ProgressionDecision[],
): ProgramStateOverview[] {
  return program.stateValues
    .filter((state): state is ProgramInstance['stateValues'][number] & { value: number } =>
      typeof state.value === 'number' && Number.isFinite(state.value) && state.value > 0,
    )
    .map((state): ProgramStateOverview => {
      // acceptedDecisions arrive newest-first, so the last match is the earliest change.
      const stateDecisions = acceptedDecisions.filter((decision) => decision.stateKey === state.key)
      const earliest = stateDecisions[stateDecisions.length - 1]
      const startValue =
        typeof earliest?.previousValue === 'number' && Number.isFinite(earliest.previousValue)
          ? earliest.previousValue
          : state.value
      return {
        movementId: state.movementId,
        movementName: getMovementName(state.movementId),
        stateKey: state.key,
        stateType: state.type,
        label: state.label ?? null,
        value: state.value,
        units: program.units,
        startValue,
        updatedAt: state.updatedAt ?? null,
        pendingDecision: pendingDecisions.find((decision) => decision.stateKey === state.key) ?? null,
        lastAcceptedDecision: stateDecisions[0] ?? null,
      }
    })
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
              (item.phaseKey === movement.phaseKey || item.phaseKey === '*') &&
              item.role === movement.role &&
              item.replacementMovementId === movement.movementId,
          )
          const isAdded = Boolean(movement.isAdded)
          return {
            slotId: movement.slotId ?? movement.id,
            movementId: movement.movementId,
            movementName: movement.movementName,
            role: movement.role,
            targetSummary: movement.targetSummary,
            replacedMovementName: override ? getMovementName(override.originalMovementId) : null,
            isAdded,
          }
        }),
    }
  })
}

function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo
}
