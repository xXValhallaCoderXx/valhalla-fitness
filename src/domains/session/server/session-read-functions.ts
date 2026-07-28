import { createServerFn } from '@tanstack/react-start'
import type {
  MovementSlot,
  PlannedSession,
  SessionPr,
  SetLog,
  TodayPayload,
  WorkoutSession,
} from '~/domains/session'
import type { Unit } from '~/shared/types'
import { sessionLineageKey } from '~/domains/session/lib/ad-hoc'
import {
  collectChunkedSessionQueryPages,
  collectSessionQueryPages,
  uniqueRowsById,
} from '~/domains/session/lib/session-query-pages'
import { ensureProfile } from '~/domains/account/server/profile-functions'
import { expandPlannedSession, programForNextUncompletedSession } from '~/domains/program/lib/templates'
import { e1rm, mround } from '~/domains/program/lib/progression'
import { getMovementName } from '~/domains/movement/lib/movements'
import { sessionIdInputSchema } from '~/domains/session/lib/schemas'
import type { SupabaseServerClient } from '~/shared/server/supabase'
import { calendarDateInTimeZone } from '~/shared/lib/calendar-date'
import {
  getActiveProgramInternal,
  getPendingDecisionsInternal,
  updateProgramCurrentWeekIndex,
} from '~/domains/program/server/program-functions'
import { requireSessionUser } from '~/domains/session/server/session-server'

export async function getTodayInternal(timeZone?: string | null): Promise<TodayPayload> {
  const { supabase, user } = await requireSessionUser()
  let activeProgram = await getActiveProgramInternal()

  // Any in-progress session — ad-hoc sessions have no program, so don't scope by one.
  const { data: activeSessionRow, error } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const activeSession = activeSessionRow ? await getSessionInternal(activeSessionRow.id) : null

  if (!activeProgram) {
    return {
      activeProgram: null,
      plannedSession: null,
      activeSession,
      completedSession: null,
      pendingDecisions: [],
    }
  }

  const templateDefinition = activeProgram.templateDefinition
  if (!templateDefinition) throw new Error('Active program template definition missing')
  const profile = await ensureProfile()
  const scheduledDate = calendarDateInTimeZone(new Date(), timeZone ?? profile.timezone)

  const { data: completedSessionRows, error: completedSessionError } = await supabase
    .from('workout_sessions')
    .select('id, planned_session_id')
    .eq('user_id', user.id)
    .eq('program_instance_id', activeProgram.id)
    .eq('status', 'completed')
    .eq('scheduled_date', scheduledDate)
    .order('completed_at', { ascending: false })
  if (completedSessionError) throw new Error(completedSessionError.message)

  const completedSessionRow = completedSessionRows?.[0]
  const completedSession = completedSessionRow ? await getSessionInternal(completedSessionRow.id) : null
  if (!activeSession) {
    const nextProgram = programForNextUncompletedSession(
      activeProgram,
      (completedSessionRows ?? []).map((row) => row.planned_session_id).filter((id): id is string => id !== null),
      scheduledDate,
      templateDefinition,
    )
    if (nextProgram.currentWeekIndex !== activeProgram.currentWeekIndex) {
      activeProgram = await updateProgramCurrentWeekIndex(supabase, user.id, nextProgram)
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

export async function getPreviousComparablesBySlotId(
  supabase: SupabaseServerClient,
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

  const movementIdList = Array.from(movementIds)
  const [plannedExerciseRows, performedExerciseRows] = await Promise.all([
    collectSessionQueryPages((from, to) =>
      supabase
        .from('exercise_logs')
        .select('id, session_id, slot_id, planned_movement_id, performed_movement_id, role, created_at')
        .eq('user_id', userId)
        .in('planned_movement_id', movementIdList)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to),
    ),
    collectSessionQueryPages((from, to) =>
      supabase
        .from('exercise_logs')
        .select('id, session_id, slot_id, planned_movement_id, performed_movement_id, role, created_at')
        .eq('user_id', userId)
        .in('performed_movement_id', movementIdList)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to),
    ),
  ])
  const relevantExerciseRows = uniqueRowsById(
    [...plannedExerciseRows, ...performedExerciseRows],
  )
  const exerciseIds = relevantExerciseRows.map((exercise) => exercise.id)
  const sessionIds = Array.from(new Set(relevantExerciseRows.map((exercise) => exercise.session_id)))
  if (!exerciseIds.length || !sessionIds.length) return {}

  const sessionRows = await collectChunkedSessionQueryPages(sessionIds, (idChunk, from, to) =>
    supabase
      .from('workout_sessions')
      .select('id, status, completed_at, scheduled_date, prescription_snapshot')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .in('id', idChunk)
      .order('id', { ascending: true })
      .range(from, to),
  )

  const completedSessionsById = new Map<string, ComparableSessionRow>(
    sessionRows.map((session) => [session.id, { ...session, prescription_snapshot: session.prescription_snapshot as PlannedSession | null }]),
  )
  const completedExerciseRows = relevantExerciseRows.filter((exercise) => completedSessionsById.has(exercise.session_id))
  if (!completedExerciseRows.length) return {}

  const setRows = await collectChunkedSessionQueryPages(
    completedExerciseRows.map((exercise) => exercise.id),
    (idChunk, from, to) =>
      supabase
        .from('set_logs')
        .select('id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, target_rpe, actual_load, actual_reps, actual_rir, actual_rpe, completed, is_top_set, is_amrap, is_backoff')
        .eq('user_id', userId)
        .eq('completed', true)
        .in('exercise_log_id', idChunk)
        .order('exercise_log_id', { ascending: true })
        .order('set_index', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
  )

  const setsByExerciseId = new Map<string, SetLog[]>()
  for (const row of setRows) {
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

  const candidates: ComparableCandidate[] = completedExerciseRows.map((exercise): ComparableCandidate => {
    const session = completedSessionsById.get(exercise.session_id)
    const snapshot = session?.prescription_snapshot ?? null
    return {
      slotId: exercise.slot_id,
      plannedMovementId: exercise.planned_movement_id,
      performedMovementId: exercise.performed_movement_id,
      role: exercise.role as MovementSlot['role'],
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
    // Fall through the ranking when a candidate has no completed sets (e.g. a
    // workout finished without logging anything) — a dead top candidate would
    // otherwise erase "last time" and the per-set ghosts entirely.
    for (const { candidate } of ranked) {
      const comparable = comparableFromCandidate(movement, candidate, plannedSession.units)
      if (comparable) {
        result[slotId] = comparable
        break
      }
    }
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

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
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
    // Per-set actuals power the per-row "last time" ghosts in the logger.
    sets: completedSets.map((completedSet) => ({
      setIndex: completedSet.setIndex,
      load: completedSet.actualLoad ?? completedSet.targetLoad ?? null,
      reps: completedSet.actualReps ?? null,
      rir: completedSet.actualRir ?? null,
    })),
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
  const { supabase, user } = await requireSessionUser()
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

  const exerciseIds = (exerciseRows ?? []).map((row) => row.id)
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
  const isAdHoc = sessionRow.program_instance_id === null || snapshot.kind === 'ad_hoc'
  // Favourite state belongs to the workout lineage, not this row alone: a repeat of a
  // favourited workout (or the root of a favourited repeat) reads as favourited too.
  let isFavorite = Boolean(sessionRow.is_favorite)
  if (isAdHoc && !isFavorite) {
    const lineageKey = sessionLineageKey(sessionRow)
    const { data: lineageFavorite, error: lineageError } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .or(`id.eq.${lineageKey},source_session_id.eq.${lineageKey}`)
      .limit(1)
      .maybeSingle()
    if (lineageError) throw new Error(lineageError.message)
    isFavorite = Boolean(lineageFavorite)
  }
  return {
    ...snapshot,
    sessionId: sessionRow.id,
    stateVersion: Number(sessionRow.state_version),
    status: sessionRow.status as WorkoutSession['status'],
    startedAt: sessionRow.started_at,
    completedAt: sessionRow.completed_at,
    notes: sessionRow.notes,
    sessionRpe: sessionRow.session_rpe === null ? null : Number(sessionRow.session_rpe),
    reflectionWin: sessionRow.reflection_win,
    reflectionImprove: sessionRow.reflection_improve,
    prs: (sessionRow.prs as SessionPr[] | null) ?? null,
    isAdHoc,
    isFavorite,
    sourceSessionId: sessionRow.source_session_id ?? null,
    syncState: 'synced',
    movements: snapshot.movements.map((movement) => {
      const slotId = movement.slotId ?? movement.id
      const exercise = (exerciseRows ?? []).find((row) => row.slot_id === slotId)
      const sets = (setRows ?? [])
        .filter((set) => set.exercise_log_id === exercise?.id)
        .map((set): SetLog => ({
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

export const getTodayFn = createServerFn({ method: 'GET' }).handler(() => getTodayInternal())

export const getSessionFn = createServerFn({ method: 'GET' })
  .validator((data) => sessionIdInputSchema.parse(data))
  .handler(async ({ data }) => getSessionInternal(data.sessionId))
