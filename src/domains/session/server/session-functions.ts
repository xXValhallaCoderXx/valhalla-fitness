import { createServerFn } from '@tanstack/react-start'
import type {
  AccessoryProgressionMethod,
  Movement,
  MovementSlot,
  MovementSwapOption,
  PlannedSession,
  SessionSummary,
  SetLog,
  SetTarget,
  SubstitutionReason,
  SwapScope,
  TodayPayload,
  Unit,
  WorkoutSession,
} from '~/shared/types'
import {
  accessoryProgressionRuleId,
  accessoryTargetSummary,
  buildAccessoryInitialSets,
  isAccessoryProgressionMethod,
  parseAccessoryRepTarget,
} from '~/domains/session/lib/accessories'
import { expandPlannedSession, programForNextUncompletedSession } from '~/domains/program/lib/templates'
import { e1rm, mround } from '~/domains/program/lib/progression'
import { accessoryOutcomeSummary, buildProgressionDecisionsForSession } from '~/domains/program/lib/progression-decisions'
import { buildMovementSwapOptions, getMovementName } from '~/domains/movement/lib/movements'
import { getMovementCatalogForSwap, getReplacementRulesForSwap } from '~/domains/movement/server/movement-functions'
import {
  getActiveProgramInternal,
  getPendingDecisionsInternal,
  normalizeCustomizationSummary,
  updateProgramCurrentWeekIndex,
} from '~/domains/program/server/program-functions'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export async function getTodayInternal(): Promise<TodayPayload> {
  let activeProgram = await getActiveProgramInternal()
  if (!activeProgram) {
    return {
      activeProgram: null,
      plannedSession: null,
      activeSession: null,
      completedSession: null,
      pendingDecisions: [],
    }
  }

  const { supabase, user } = await requireUser()
  const templateDefinition = activeProgram.templateDefinition
  if (!templateDefinition) throw new Error('Active program template definition missing')
  const scheduledDate = new Date().toISOString().slice(0, 10)
  const { data: activeSessionRow, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('program_instance_id', activeProgram.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)

  const { data: completedSessionRows, error: completedSessionError } = await supabase
    .from('workout_sessions')
    .select('id, planned_session_id')
    .eq('user_id', user.id)
    .eq('program_instance_id', activeProgram.id)
    .eq('status', 'completed')
    .eq('scheduled_date', scheduledDate)
    .order('completed_at', { ascending: false })
  if (completedSessionError) throw new Error(completedSessionError.message)

  const activeSession = activeSessionRow ? await getSessionInternal(activeSessionRow.id) : null
  const completedSessionRow = completedSessionRows?.[0]
  const completedSession = completedSessionRow ? await getSessionInternal(completedSessionRow.id) : null
  if (!activeSession) {
    const nextProgram = programForNextUncompletedSession(
      activeProgram,
      (completedSessionRows ?? []).map((row: any) => row.planned_session_id),
      scheduledDate,
      templateDefinition,
    )
    if (nextProgram.currentWeekIndex !== activeProgram.currentWeekIndex) {
      await updateProgramCurrentWeekIndex(supabase, user.id, nextProgram)
      activeProgram = nextProgram
    }
  }

  const barePlannedSession = expandPlannedSession(activeProgram, scheduledDate, templateDefinition)
  const plannedSession = expandPlannedSession(
    activeProgram,
    scheduledDate,
    templateDefinition,
    await getPreviousComparablesBySlotId(supabase, user.id, barePlannedSession),
  )
  const pendingDecisions = await getPendingDecisionsInternal(activeProgram.id)

  return {
    activeProgram,
    plannedSession,
    activeSession,
    completedSession,
    pendingDecisions,
  }
}

type ComparableCandidate = {
  slotId: string
  plannedMovementId: string
  performedMovementId: string
  role: MovementSlot['role']
  completedAt?: string | null
  scheduledDate: string
  templateId?: string | null
  sets: SetLog[]
}

type ComparableSessionRow = {
  id: string
  completed_at?: string | null
  scheduled_date: string
  prescription_snapshot?: PlannedSession | null
}

async function getPreviousComparablesBySlotId(
  supabase: any,
  userId: string,
  plannedSession: PlannedSession,
): Promise<Record<string, MovementSlot['previous']>> {
  const movementIds = new Set(
    plannedSession.movements.flatMap((movement) => [
      movement.movementId,
      movement.performedMovementId ?? movement.movementId,
    ]),
  )
  if (!movementIds.size) return {}

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from('exercise_logs')
    .select('id, session_id, slot_id, planned_movement_id, performed_movement_id, role, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(400)
  if (exerciseError) throw new Error(exerciseError.message)

  const relevantExerciseRows = (exerciseRows ?? []).filter(
    (exercise: any) =>
      movementIds.has(exercise.planned_movement_id) ||
      movementIds.has(exercise.performed_movement_id),
  )
  const exerciseIds = relevantExerciseRows.map((exercise: any) => exercise.id as string)
  const sessionIds = Array.from(new Set(relevantExerciseRows.map((exercise: any) => exercise.session_id as string)))
  if (!exerciseIds.length || !sessionIds.length) return {}

  const { data: sessionRows, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('id, status, completed_at, scheduled_date, prescription_snapshot')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .in('id', sessionIds)
  if (sessionError) throw new Error(sessionError.message)

  const completedSessionsById = new Map<string, ComparableSessionRow>(
    (sessionRows ?? []).map((session: any) => [session.id, session as ComparableSessionRow]),
  )
  const completedExerciseRows = relevantExerciseRows.filter((exercise: any) => completedSessionsById.has(exercise.session_id))
  if (!completedExerciseRows.length) return {}

  const { data: setRows, error: setError } = await supabase
    .from('set_logs')
    .select('id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, target_rpe, actual_load, actual_reps, actual_rir, actual_rpe, completed, is_top_set, is_amrap, is_backoff')
    .eq('user_id', userId)
    .in('exercise_log_id', completedExerciseRows.map((exercise: any) => exercise.id))
    .order('set_index', { ascending: true })
  if (setError) throw new Error(setError.message)

  const setsByExerciseId = new Map<string, SetLog[]>()
  for (const row of setRows ?? []) {
    const sets = setsByExerciseId.get(row.exercise_log_id) ?? []
    sets.push({
      id: row.id,
      exerciseLogId: row.exercise_log_id,
      setIndex: row.set_index,
      targetLoad: row.target_load === null ? null : Number(row.target_load),
      targetReps: row.target_reps,
      targetRepMin: row.target_rep_min,
      targetRepMax: row.target_rep_max,
      targetRir: row.target_rir === null ? null : Number(row.target_rir),
      targetRpe: row.target_rpe === null ? null : Number(row.target_rpe),
      actualLoad: row.actual_load === null ? null : Number(row.actual_load),
      actualReps: row.actual_reps,
      actualRir: row.actual_rir === null ? null : Number(row.actual_rir),
      actualRpe: row.actual_rpe === null ? null : Number(row.actual_rpe),
      completed: row.completed,
      isTopSet: row.is_top_set,
      isAmrap: row.is_amrap,
      isBackoff: row.is_backoff,
    })
    setsByExerciseId.set(row.exercise_log_id, sets)
  }

  const candidates: ComparableCandidate[] = completedExerciseRows.map((exercise: any): ComparableCandidate => {
    const session = completedSessionsById.get(exercise.session_id)
    const snapshot = session?.prescription_snapshot as PlannedSession | null
    return {
      slotId: exercise.slot_id,
      plannedMovementId: exercise.planned_movement_id,
      performedMovementId: exercise.performed_movement_id,
      role: exercise.role,
      completedAt: session?.completed_at,
      scheduledDate: session?.scheduled_date ?? plannedSession.scheduledDate,
      templateId: snapshot?.templateId ?? null,
      sets: setsByExerciseId.get(exercise.id) ?? [],
    }
  })

  const result: Record<string, MovementSlot['previous']> = {}
  for (const movement of plannedSession.movements) {
    const slotId = movement.slotId ?? movement.id
    const ranked: Array<{ candidate: ComparableCandidate; score: number }> = candidates
      .map((candidate) => ({
        candidate,
        score: scoreComparableCandidate(plannedSession, movement, candidate),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        return comparableDate(right.candidate).localeCompare(comparableDate(left.candidate))
      })
    const best = ranked[0]?.candidate
    const comparable = best ? comparableFromCandidate(movement, best, plannedSession.units) : null
    if (comparable) result[slotId] = comparable
  }
  return result
}

function scoreComparableCandidate(
  plannedSession: PlannedSession,
  movement: MovementSlot,
  candidate: ComparableCandidate,
) {
  let score = 0
  const performedMovementId = movement.performedMovementId ?? movement.movementId
  if (candidate.performedMovementId === performedMovementId) score += 100
  if (candidate.plannedMovementId === movement.movementId) score += 80
  if (candidate.role === movement.role) score += 20
  if (candidate.templateId === plannedSession.templateId) score += 8
  if (candidate.slotId === (movement.slotId ?? movement.id)) score += 12
  return score
}

function comparableFromCandidate(
  movement: MovementSlot,
  candidate: ComparableCandidate,
  units: Unit,
): MovementSlot['previous'] {
  const completedSets = candidate.sets.filter((set) => set.completed && hasNumber(set.actualReps))
  if (!completedSets.length) return null
  const set = movement.role === 'main' ? bestMainComparableSet(completedSets) : bestAccessoryComparableSet(completedSets)
  if (!set) return null

  const load = set.actualLoad ?? set.targetLoad ?? null
  const reps = set.actualReps ?? set.targetReps ?? null
  const estimatedMax = hasNumber(load) && hasNumber(reps) ? mround(e1rm(load, reps, set.actualRir ?? 0), 0.5) : null
  const label =
    movement.role === 'main'
      ? `Last comparable: ${formatComparableSet(set, units)}${estimatedMax ? ` · e1RM ${formatNumber(estimatedMax)} ${units}` : ''} · ${formatComparableDate(comparableDate(candidate))}`
      : `Last time: ${formatComparableSet(set, units)} · ${formatComparableDate(comparableDate(candidate))}`

  return {
    movementId: candidate.performedMovementId,
    label,
    load,
    reps,
    rir: set.actualRir ?? null,
    performedAt: candidate.completedAt ?? candidate.scheduledDate,
    e1rm: estimatedMax,
    setType: set.isAmrap ? 'amrap' : set.isTopSet ? 'top_set' : set.isBackoff ? 'backoff' : movement.role === 'accessory' ? 'accessory' : 'best_set',
  }
}

function bestMainComparableSet(sets: SetLog[]) {
  const topSets = sets.filter((set) => set.isTopSet || set.isAmrap)
  const pool = topSets.length ? topSets : sets
  return [...pool].sort((left, right) => setScore(right) - setScore(left))[0] ?? null
}

function bestAccessoryComparableSet(sets: SetLog[]) {
  return [...sets].sort((left, right) => setScore(right) - setScore(left))[0] ?? null
}

function setScore(set: SetLog) {
  const load = set.actualLoad ?? set.targetLoad ?? 0
  const reps = set.actualReps ?? set.targetReps ?? 0
  return load > 0 ? e1rm(load, reps, set.actualRir ?? 0) : reps
}

function comparableDate(candidate: ComparableCandidate) {
  return candidate.completedAt ?? candidate.scheduledDate
}

function formatComparableSet(set: SetLog, units: Unit) {
  const load = set.actualLoad ?? set.targetLoad
  const reps = set.actualReps ?? set.targetReps
  const rir = typeof set.actualRir === 'number' ? ` @ RIR ${set.actualRir}` : ''
  const loadText = typeof load === 'number' ? `${formatNumber(load)} ${units}` : 'bodyweight'
  return `${loadText} x ${reps ?? '-'}${set.isAmrap ? '+' : ''}${rir}`
}

function formatComparableDate(value: string) {
  return value.slice(0, 10)
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

export async function getSessionInternal(sessionId: string): Promise<WorkoutSession> {
  const { supabase, user } = await requireUser()
  const { data: sessionRow, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()
  if (error) throw new Error(error.message)

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .order('order_index')
  if (exerciseError) throw new Error(exerciseError.message)

  const exerciseIds = (exerciseRows ?? []).map((row: any) => row.id)
  const { data: setRows, error: setError } = exerciseIds.length
    ? await supabase
        .from('set_logs')
        .select('*')
        .in('exercise_log_id', exerciseIds)
        .eq('user_id', user.id)
        .order('set_index')
    : { data: [], error: null }
  if (setError) throw new Error(setError.message)

  const snapshot = sessionRow.prescription_snapshot as PlannedSession
  return {
    ...snapshot,
    sessionId: sessionRow.id,
    status: sessionRow.status,
    startedAt: sessionRow.started_at,
    completedAt: sessionRow.completed_at,
    notes: sessionRow.notes,
    syncState: 'synced',
    movements: snapshot.movements.map((movement) => {
      const slotId = movement.slotId ?? movement.id
      const exercise = (exerciseRows ?? []).find((row: any) => row.slot_id === slotId)
      const sets = (setRows ?? [])
        .filter((set: any) => set.exercise_log_id === exercise?.id)
        .map((set: any): SetLog => ({
          id: set.id,
          exerciseLogId: set.exercise_log_id,
          setIndex: set.set_index,
          targetLoad: set.target_load === null ? null : Number(set.target_load),
          targetReps: set.target_reps,
          targetRepMin: set.target_rep_min,
          targetRepMax: set.target_rep_max,
          targetRpe: set.target_rpe === null ? null : Number(set.target_rpe),
          targetRir: set.target_rir === null ? null : Number(set.target_rir),
          actualLoad: set.actual_load === null ? null : Number(set.actual_load),
          actualReps: set.actual_reps,
          actualRpe: set.actual_rpe === null ? null : Number(set.actual_rpe),
          actualRir: set.actual_rir === null ? null : Number(set.actual_rir),
          completed: set.completed,
          isTopSet: set.is_top_set,
          isAmrap: set.is_amrap,
          isBackoff: set.is_backoff,
          note: set.note,
          clientMutationId: set.client_mutation_id,
          syncState: 'synced',
        }))
      return {
        ...movement,
        slotId,
        id: exercise?.id ?? movement.id,
        performedMovementId: exercise?.performed_movement_id ?? movement.movementId,
        performedMovementName: getMovementName(exercise?.performed_movement_id ?? movement.movementId),
        notes: exercise?.notes,
        sets: sets.length ? sets : movement.sets,
      }
    }),
  }
}

export const getTodayFn = createServerFn({ method: 'GET' }).handler(getTodayInternal)

export const startSessionFn = createServerFn({ method: 'POST' })
  .validator((data: { clientMutationId: string }) => data)
  .handler(async ({ data }) => {
    const today = await getTodayInternal()
    if (!today.activeProgram || !today.plannedSession) throw new Error('No planned session')
    if (today.activeSession) return today.activeSession
    if (today.pendingDecisions.length > 0) {
      throw new Error('Resolve your pending progression changes before starting the next session.')
    }
    const { supabase, user } = await requireUser()
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        program_instance_id: today.activeProgram.id,
        planned_session_id: today.plannedSession.id,
        status: 'in_progress',
        scheduled_date: today.plannedSession.scheduledDate,
        started_at: new Date().toISOString(),
        prescription_snapshot: today.plannedSession,
        client_mutation_id: data.clientMutationId,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    for (const movement of today.plannedSession.movements) {
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: user.id,
          session_id: session.id,
          slot_id: movement.slotId ?? movement.id,
          planned_movement_id: movement.movementId,
          performed_movement_id: movement.performedMovementId ?? movement.movementId,
          role: movement.role,
          order_index: movement.orderIndex,
          target_summary: movement.targetSummary,
        })
        .select('*')
        .single()
      if (exerciseError) throw new Error(exerciseError.message)
      const { error: setError } = await supabase.from('set_logs').insert(
        movement.sets.map((set) => ({
          user_id: user.id,
          exercise_log_id: exercise.id,
          set_index: set.setIndex,
          target_load: set.targetLoad,
          target_reps: set.targetReps,
          target_rep_min: set.targetRepMin,
          target_rep_max: set.targetRepMax,
          target_rpe: set.targetRpe,
          target_rir: set.targetRir,
          actual_load: set.actualLoad,
          actual_reps: set.actualReps,
          is_top_set: Boolean(set.isTopSet),
          is_amrap: Boolean(set.isAmrap),
          is_backoff: Boolean(set.isBackoff),
        })),
      )
      if (setError) throw new Error(setError.message)
    }

    return getSessionInternal(session.id)
  })

export const getSessionFn = createServerFn({ method: 'GET' })
  .validator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => getSessionInternal(data.sessionId))

export const upsertSetLogFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      sessionId: string
      exerciseLogId: string
      setIndex: number
      actualLoad?: number | null
      actualReps?: number | null
      actualRir?: number | null
      actualRpe?: number | null
      completed?: boolean
      note?: string | null
      clientMutationId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('status')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    if (sessionRow.status === 'completed') {
      throw new Error('This session is already finished. Completed sessions cannot be edited.')
    }
    if (sessionRow.status !== 'in_progress') {
      throw new Error('Only in-progress sessions can be edited.')
    }

    const { error } = await supabase
      .from('set_logs')
      .update({
        actual_load: data.actualLoad,
        actual_reps: data.actualReps,
        actual_rir: data.actualRir,
        actual_rpe: data.actualRpe,
        completed: data.completed ?? false,
        note: data.note,
        client_mutation_id: data.clientMutationId,
      })
      .eq('user_id', user.id)
      .eq('exercise_log_id', data.exerciseLogId)
      .eq('set_index', data.setIndex)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return getSessionInternal(data.sessionId)
  })

function templateSessionIdForSnapshot(snapshot: PlannedSession, sessionRow: any) {
  if (snapshot.templateSessionId) return snapshot.templateSessionId
  const plannedSessionId = String(sessionRow.planned_session_id ?? snapshot.id)
  return plannedSessionId.replace(/-w\d+$/i, '')
}

function setLogsFromTargets(exerciseLogId: string, userId: string, sets: SetTarget[]) {
  return sets.map((set) => ({
    user_id: userId,
    exercise_log_id: exerciseLogId,
    set_index: set.setIndex,
    target_load: set.targetLoad ?? null,
    target_reps: set.targetReps ?? null,
    target_rep_min: set.targetRepMin ?? null,
    target_rep_max: set.targetRepMax ?? null,
    target_rpe: set.targetRpe ?? null,
    target_rir: set.targetRir ?? null,
    actual_load: set.targetLoad ?? null,
    actual_reps: set.targetReps ?? set.targetRepMin ?? null,
    is_top_set: Boolean(set.isTopSet),
    is_amrap: Boolean(set.isAmrap),
    is_backoff: Boolean(set.isBackoff),
  }))
}

function movementSlotFromAccessoryInput({
  slotId,
  phaseKey,
  movement,
  orderIndex,
  targetSummary,
  sets,
  note,
  scope,
  progressionMethod,
}: {
  slotId: string
  phaseKey: string
  movement: Movement
  orderIndex: number
  targetSummary: string
  sets: SetTarget[]
  note?: string | null
  scope: SwapScope
  progressionMethod: AccessoryProgressionMethod
}): MovementSlot {
  return {
    id: slotId,
    slotId,
    phaseKey,
    movementId: movement.id,
    movementName: movement.name,
    performedMovementId: movement.id,
    performedMovementName: movement.name,
    role: 'accessory',
    orderIndex,
    targetSummary,
    progressionRuleId: accessoryProgressionRuleId(progressionMethod),
    progressionMethod,
    sets: sets.map((set) => ({
      ...set,
      actualLoad: set.targetLoad,
      actualReps: set.targetReps ?? set.targetRepMin,
      completed: false,
    })),
    previous: null,
    notes: note ?? null,
    isAdded: true,
    addedScope: scope,
  }
}

function sanitizeSlotPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-')
}

function nextAccessorySlotIds(templateSessionId: string, usedSlotIds: Set<string>, movementId: string) {
  let index = Array.from(usedSlotIds).filter((slotId) => slotId.includes('added-accessory-')).length + 1
  while (true) {
    const additionSlotId = `added-accessory-${index}-${sanitizeSlotPart(movementId)}`
    const sessionSlotId = `slot-${templateSessionId}-${additionSlotId}`
    if (!usedSlotIds.has(sessionSlotId)) return { additionSlotId, sessionSlotId }
    index += 1
  }
}

export const addSessionAccessoryFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      sessionId: string
      movementId: string
      progressionMethod: AccessoryProgressionMethod
      repTarget: string
      scope: SwapScope
      note?: string
      clientMutationId: string
    }) => data,
  )
  .handler(async ({ data }): Promise<WorkoutSession> => {
    if (!isAccessoryProgressionMethod(data.progressionMethod)) throw new Error('Invalid accessory progression method.')
    const repTarget = parseAccessoryRepTarget(data.repTarget)
    if (!repTarget) throw new Error('Enter a valid rep target, such as 8-12 or 15.')
    if (data.scope !== 'session' && data.scope !== 'phase_slot') throw new Error('Invalid accessory scope.')

    const { supabase, user } = await requireUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    if (sessionRow.status === 'completed') {
      throw new Error('This session is already finished. Completed sessions cannot be edited.')
    }
    if (sessionRow.status !== 'in_progress') {
      throw new Error('Only in-progress sessions can be edited.')
    }

    const { data: exerciseRows, error: exerciseRowsError } = await supabase
      .from('exercise_logs')
      .select('id, slot_id, order_index, client_mutation_id')
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })
    if (exerciseRowsError) throw new Error(exerciseRowsError.message)
    if ((exerciseRows ?? []).some((row: any) => row.client_mutation_id === data.clientMutationId)) {
      return getSessionInternal(data.sessionId)
    }

    const catalog = await getMovementCatalogForSwap(supabase)
    const movement = catalog[data.movementId]
    if (!movement || movement.isCompetition) throw new Error('Invalid accessory movement.')

    const snapshot = sessionRow.prescription_snapshot as PlannedSession
    const phaseKey = phaseKeyForSnapshot(snapshot)
    const templateSessionId = templateSessionIdForSnapshot(snapshot, sessionRow)
    const usedSlotIds = new Set((exerciseRows ?? []).map((row: any) => row.slot_id as string))
    for (const snapshotSlot of snapshot.movements) usedSlotIds.add(snapshotSlot.slotId ?? snapshotSlot.id)
    const { additionSlotId, sessionSlotId } = nextAccessorySlotIds(templateSessionId, usedSlotIds, movement.id)
    const maxOrderIndex = Math.max(
      0,
      ...(exerciseRows ?? []).map((row: any) => Number(row.order_index) || 0),
      ...snapshot.movements.map((item) => Number(item.orderIndex) || 0),
    )
    const orderIndex = maxOrderIndex + 1
    const note = data.note?.trim() || null
    const targetSummary = accessoryTargetSummary(repTarget, data.progressionMethod)
    const targetSets = buildAccessoryInitialSets(repTarget)
    const snapshotMovement = movementSlotFromAccessoryInput({
      slotId: sessionSlotId,
      phaseKey,
      movement,
      orderIndex,
      targetSummary,
      sets: targetSets,
      note,
      scope: data.scope,
      progressionMethod: data.progressionMethod,
    })

    const { data: exercise, error: exerciseError } = await supabase
      .from('exercise_logs')
      .insert({
        user_id: user.id,
        session_id: data.sessionId,
        slot_id: sessionSlotId,
        planned_movement_id: movement.id,
        performed_movement_id: movement.id,
        role: 'accessory',
        order_index: orderIndex,
        target_summary: targetSummary,
        notes: note,
        client_mutation_id: data.clientMutationId,
      })
      .select('id')
      .single()
    if (exerciseError) {
      if (exerciseError.code === '23505') return getSessionInternal(data.sessionId)
      throw new Error(exerciseError.message)
    }

    const { error: setError } = await supabase.from('set_logs').insert(
      setLogsFromTargets(exercise.id, user.id, targetSets),
    )
    if (setError) throw new Error(setError.message)

    const nextSnapshot: PlannedSession = {
      ...snapshot,
      templateSessionId,
      movements: [...snapshot.movements, snapshotMovement],
    }
    const { error: snapshotError } = await supabase
      .from('workout_sessions')
      .update({ prescription_snapshot: nextSnapshot })
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
    if (snapshotError) throw new Error(snapshotError.message)

    if (data.scope === 'phase_slot') {
      const { data: additionRows, error: additionRowsError } = await supabase
        .from('program_accessory_additions')
        .select('order_index')
        .eq('user_id', user.id)
        .eq('program_instance_id', sessionRow.program_instance_id)
        .eq('session_id', templateSessionId)
      if (additionRowsError) throw new Error(additionRowsError.message)
      const additionOrderIndex = Math.max(0, ...(additionRows ?? []).map((row: any) => Number(row.order_index) || 0)) + 1

      const { error: additionError } = await supabase.from('program_accessory_additions').insert({
        user_id: user.id,
        program_instance_id: sessionRow.program_instance_id,
        session_id: templateSessionId,
        slot_id: additionSlotId,
        phase_key: phaseKey,
        movement_id: movement.id,
        prescription_id: `manual-${data.progressionMethod}`,
        source_slot_id: null,
        target_summary: targetSummary,
        sets: targetSets,
        note,
        progression_method: data.progressionMethod,
        effective_from_week_index: Number(snapshot.weekIndex) + 1,
        order_index: additionOrderIndex,
      })
      if (additionError) throw new Error(additionError.message)

      const { data: programRow, error: programError } = await supabase
        .from('program_instances')
        .select('customization_summary')
        .eq('id', sessionRow.program_instance_id)
        .eq('user_id', user.id)
        .single()
      if (programError) throw new Error(programError.message)
      const summary = normalizeCustomizationSummary(programRow.customization_summary)
      const { error: summaryError } = await supabase
        .from('program_instances')
        .update({
          customization_status: 'customized',
          customization_summary: {
            ...summary,
            accessoryAdditionCount: summary.accessoryAdditionCount + 1,
          },
        })
        .eq('id', sessionRow.program_instance_id)
        .eq('user_id', user.id)
      if (summaryError) throw new Error(summaryError.message)
    }

    return getSessionInternal(data.sessionId)
  })

function setTargetFromRow(row: any, setIndex: number): SetTarget {
  return {
    id: `set-${setIndex}`,
    setIndex,
    targetLoad: row?.target_load === null || row?.target_load === undefined ? null : Number(row.target_load),
    targetReps: row?.target_reps ?? null,
    targetRepMin: row?.target_rep_min ?? null,
    targetRepMax: row?.target_rep_max ?? null,
    targetRpe: row?.target_rpe === null || row?.target_rpe === undefined ? null : Number(row.target_rpe),
    targetRir: row?.target_rir === null || row?.target_rir === undefined ? null : Number(row.target_rir),
    isTopSet: Boolean(row?.is_top_set),
    isAmrap: Boolean(row?.is_amrap),
    isBackoff: Boolean(row?.is_backoff),
    label: row?.target_reps
      ? String(row.target_reps)
      : row?.target_rep_min && row?.target_rep_max
        ? `${row.target_rep_min}-${row.target_rep_max}`
        : undefined,
  }
}

function snapshotSetFromTarget(target: SetTarget): SetLog {
  return {
    ...target,
    actualLoad: target.targetLoad ?? null,
    actualReps: target.targetReps ?? target.targetRepMin ?? null,
    completed: false,
  }
}

export const addExerciseSetFn = createServerFn({ method: 'POST' })
  .validator((data: { sessionId: string; exerciseLogId: string; clientMutationId: string }) => data)
  .handler(async ({ data }): Promise<WorkoutSession> => {
    const { supabase, user } = await requireUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    if (sessionRow.status === 'completed') {
      throw new Error('This session is already finished. Completed sessions cannot be edited.')
    }
    if (sessionRow.status !== 'in_progress') {
      throw new Error('Only in-progress sessions can be edited.')
    }

    const { data: existingMutation, error: existingMutationError } = await supabase
      .from('set_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('client_mutation_id', data.clientMutationId)
      .maybeSingle()
    if (existingMutationError) throw new Error(existingMutationError.message)
    if (existingMutation) return getSessionInternal(data.sessionId)

    const { data: exerciseRow, error: exerciseError } = await supabase
      .from('exercise_logs')
      .select('id, slot_id, role')
      .eq('id', data.exerciseLogId)
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (exerciseError) throw new Error(exerciseError.message)
    if (exerciseRow.role !== 'accessory') throw new Error('Sets can only be added to accessory movements.')

    const { data: setRows, error: setRowsError } = await supabase
      .from('set_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise_log_id', data.exerciseLogId)
      .order('set_index', { ascending: true })
    if (setRowsError) throw new Error(setRowsError.message)

    const lastSet = (setRows ?? []).at(-1)
    const setIndex = Math.max(0, ...(setRows ?? []).map((set: any) => Number(set.set_index) || 0)) + 1
    const target = setTargetFromRow(lastSet, setIndex)
    const [setInsert] = setLogsFromTargets(data.exerciseLogId, user.id, [target])
    if (!setInsert) throw new Error('Unable to build the next set.')
    const { error: setError } = await supabase.from('set_logs').insert({
      ...setInsert,
      client_mutation_id: data.clientMutationId,
    })
    if (setError) {
      if (setError.code === '23505') return getSessionInternal(data.sessionId)
      throw new Error(setError.message)
    }

    const snapshot = sessionRow.prescription_snapshot as PlannedSession
    const nextSnapshot: PlannedSession = {
      ...snapshot,
      movements: snapshot.movements.map((movement) => {
        if ((movement.slotId ?? movement.id) !== exerciseRow.slot_id) return movement
        return {
          ...movement,
          sets: [...movement.sets, snapshotSetFromTarget(target)],
        }
      }),
    }
    const { error: snapshotError } = await supabase
      .from('workout_sessions')
      .update({ prescription_snapshot: nextSnapshot })
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
    if (snapshotError) throw new Error(snapshotError.message)

    return getSessionInternal(data.sessionId)
  })

type SwapContext = {
  sessionRow: any
  exerciseRow: any
  snapshot: PlannedSession
  slotId: string
  phaseKey: string
  role: MovementSlot['role']
}

function phaseKeyForSnapshot(snapshot: PlannedSession, movement?: MovementSlot | null) {
  if (movement?.phaseKey) return movement.phaseKey
  const snapshotPhaseKey = snapshot.movements.find((item) => item.phaseKey)?.phaseKey
  if (snapshotPhaseKey) return snapshotPhaseKey
  if (snapshot.templateId === 'old_school_wave_powerbuilding' || snapshot.templateId === 'bromley-bullmastiff') {
    return snapshot.weekLabel.toLowerCase().startsWith('peak') ? 'peak' : 'base'
  }
  return 'cycle'
}

async function getSwapContext(supabase: any, userId: string, sessionId: string, exerciseLogId: string): Promise<SwapContext> {
  const { data: sessionRow, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()
  if (sessionError) throw new Error(sessionError.message)

  const { data: exerciseRow, error: exerciseError } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('id', exerciseLogId)
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single()
  if (exerciseError) throw new Error(exerciseError.message)

  const snapshot = sessionRow.prescription_snapshot as PlannedSession
  const slotId = exerciseRow.slot_id as string
  const movement = snapshot.movements.find((item) => (item.slotId ?? item.id) === slotId)

  return {
    sessionRow,
    exerciseRow,
    snapshot,
    slotId,
    phaseKey: phaseKeyForSnapshot(snapshot, movement),
    role: exerciseRow.role,
  }
}

async function getSwapOptionsForContext(supabase: any, context: SwapContext): Promise<MovementSwapOption[]> {
  if (context.role === 'main') return []
  const [catalog, rules] = await Promise.all([
    getMovementCatalogForSwap(supabase),
    getReplacementRulesForSwap(supabase),
  ])
  const options = buildMovementSwapOptions({
    movementId: context.exerciseRow.planned_movement_id,
    role: context.role,
    templateId: context.snapshot.templateId,
    phaseKey: context.phaseKey,
    slotId: context.slotId,
    catalog,
    rules,
  }).filter((option) => option.movementId !== context.exerciseRow.performed_movement_id)
  if (context.exerciseRow.performed_movement_id !== context.exerciseRow.planned_movement_id) {
    const plannedMovement = catalog[context.exerciseRow.planned_movement_id]
    if (plannedMovement) {
      options.unshift({
        movementId: plannedMovement.id,
        movementName: plannedMovement.name,
        category: plannedMovement.category,
        equipment: plannedMovement.equipment,
        relationshipLabel: 'Default for this slot',
        source: 'default',
        allowedScopes: ['session', 'phase_slot'],
      })
    }
  }
  return options
}

export const listMovementSwapOptionsFn = createServerFn({ method: 'GET' })
  .validator((data: { sessionId: string; exerciseLogId: string }) => data)
  .handler(async ({ data }): Promise<MovementSwapOption[]> => {
    const { supabase, user } = await requireUser()
    const context = await getSwapContext(supabase, user.id, data.sessionId, data.exerciseLogId)
    return getSwapOptionsForContext(supabase, context)
  })

export const substituteMovementFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      sessionId: string
      exerciseLogId: string
      performedMovementId: string
      reason: SubstitutionReason
      note?: string
      scope?: SwapScope
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const scope = data.scope ?? 'session'
    const context = await getSwapContext(supabase, user.id, data.sessionId, data.exerciseLogId)

    if (context.sessionRow.status === 'completed') {
      throw new Error('This session is already finished. Completed sessions cannot be edited.')
    }
    if (context.sessionRow.status !== 'in_progress') {
      throw new Error('Only in-progress sessions can be edited.')
    }
    if (context.role === 'main') {
      throw new Error('Main lifts cannot be swapped.')
    }

    const options = await getSwapOptionsForContext(supabase, context)
    const selectedOption = options.find(
      (option) => option.movementId === data.performedMovementId && option.allowedScopes.includes(scope),
    )
    if (!selectedOption) {
      throw new Error('This movement is not an allowed replacement for the selected slot.')
    }

    const { error } = await supabase
      .from('exercise_logs')
      .update({ performed_movement_id: data.performedMovementId })
      .eq('id', data.exerciseLogId)
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)

    const { error: logError } = await supabase.from('substitution_logs').insert({
      user_id: user.id,
      session_id: data.sessionId,
      slot_id: context.slotId,
      planned_movement_id: context.exerciseRow.planned_movement_id,
      performed_movement_id: data.performedMovementId,
      reason: data.reason,
      note: data.note,
    })
    if (logError) throw new Error(logError.message)

    if (scope === 'phase_slot') {
      const { data: programRow, error: programError } = await supabase
        .from('program_instances')
        .select('id, current_week_index')
        .eq('id', context.sessionRow.program_instance_id)
        .eq('user_id', user.id)
        .single()
      if (programError) throw new Error(programError.message)

      const isRestoringDefault = data.performedMovementId === context.exerciseRow.planned_movement_id
      const { error: overrideError } = isRestoringDefault
        ? await supabase
            .from('program_movement_overrides')
            .delete()
            .eq('user_id', user.id)
            .eq('program_instance_id', programRow.id)
            .eq('slot_id', context.slotId)
            .eq('phase_key', context.phaseKey)
            .eq('role', context.role)
        : await supabase
            .from('program_movement_overrides')
            .upsert(
              {
                user_id: user.id,
                program_instance_id: programRow.id,
                slot_id: context.slotId,
                phase_key: context.phaseKey,
                role: context.role,
                original_movement_id: context.exerciseRow.planned_movement_id,
                replacement_movement_id: data.performedMovementId,
                effective_from_week_index: Number(programRow.current_week_index) + 1,
                source_session_id: data.sessionId,
                source_exercise_log_id: data.exerciseLogId,
              },
              { onConflict: 'program_instance_id,slot_id,phase_key,role' },
            )
      if (overrideError) throw new Error(overrideError.message)
    }

    return getSessionInternal(data.sessionId)
  })

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export const finishSessionFn = createServerFn({ method: 'POST' })
  .validator((data: { sessionId: string; notes?: string | null }) => data)
  .handler(async ({ data }): Promise<SessionSummary> => {
    const activeProgram = await getActiveProgramInternal()
    if (!activeProgram) throw new Error('No active program')
    const session = await getSessionInternal(data.sessionId)
    if (session.status === 'completed') throw new Error('Session is already finished')
    if (session.status !== 'in_progress') throw new Error('Only in-progress sessions can be finished')
    const { supabase, user } = await requireUser()
    const decisions = buildProgressionDecisionsForSession(session, activeProgram)

    const { error: finishError } = await supabase
      .from('workout_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: data.notes,
      })
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .select('id')
      .single()
    if (finishError) throw new Error(finishError.message)

    await updateProgramCurrentWeekIndex(supabase, user.id, {
      ...activeProgram,
      currentWeekIndex: activeProgram.currentWeekIndex + 1,
    })

    if (decisions.length > 0) {
      const { data: insertedDecisions, error: decisionError } = await supabase
        .from('progression_decisions')
        .insert(
          decisions.map((decision) => ({
            user_id: user.id,
            program_instance_id: activeProgram.id,
            movement_id: decision.movementId,
            rule_id: decision.ruleId,
            scope: decision.scope,
            status: 'pending',
            input_summary: decision.inputSummary,
            recommendation: decision.recommendation,
            state_key: decision.stateKey,
            state_type: decision.stateType,
            previous_value: decision.previousValue,
            recommended_value: decision.recommendedValue,
          })),
        )
        .select('id, movement_id')
      if (decisionError) throw new Error(decisionError.message)
      // The builder's decisions carry placeholder ids; swap in the DB uuids (one decision per
      // movement) so the summary page can resolve them without re-fetching.
      const decisionIdByMovement = new Map(
        (insertedDecisions ?? []).map((row: { id: string; movement_id: string }) => [row.movement_id, row.id]),
      )
      for (const decision of decisions) {
        decision.id = decisionIdByMovement.get(decision.movementId) ?? decision.id
      }
    }

    const completedSession = await getSessionInternal(data.sessionId)
    const sets = completedSession.movements.flatMap((movement) => movement.sets)
    return {
      session: completedSession,
      completedSets: sets.filter((set) => set.completed).length,
      totalSets: sets.length,
      topSets: sets.filter((set) => set.isTopSet || set.isAmrap),
      accessoryOutcomes: completedSession.movements
        .filter((movement) => movement.role === 'accessory')
        .map((movement) => `${movement.movementName}: ${accessoryOutcomeSummary(movement)}`),
      decisions,
    }
  })
