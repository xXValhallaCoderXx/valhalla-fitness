import { createServerFn } from '@tanstack/react-start'
import type {
  HistoryDashboard,
  MovementHistoryEntry,
  PlannedSession,
  ProgramOverview,
  ProgramRecentSessionSummary,
  ProgressionDecision,
  RecentHistoryEntry,
  Unit,
} from '~/shared/types'
import {
  buildHistoryDashboard,
  type HistorySessionInput,
  type HistorySubstitutionInput,
} from '~/domains/history/lib/history'
import { buildProgramOverview } from '~/domains/program/lib/program-overview'
import { getMovementName } from '~/domains/movement/lib/movements'
import { mapProgressionDecision } from '~/domains/program/server/program-functions'
import { favoriteLineageKeys, sessionLineageKey } from '~/domains/session/lib/ad-hoc'
import { getTodayInternal } from '~/domains/session/server/session-functions'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

/** Lineage keys of the user's favourited workouts — repeats of a favourite show its star. */
async function getFavoriteLineageKeys(supabase: any, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, source_session_id')
    .eq('user_id', userId)
    .eq('is_favorite', true)
  if (error) throw new Error(error.message)
  return favoriteLineageKeys(data ?? [])
}

export async function getHistoryInputs(
  supabase: any,
  userId: string,
  options: {
    programInstanceId?: string
    limit?: number
  } = {},
): Promise<{ sessions: HistorySessionInput[]; substitutions: HistorySubstitutionInput[] }> {
  let sessionQuery = supabase
    .from('workout_sessions')
    .select('id, program_instance_id, planned_session_id, status, completed_at, scheduled_date, prescription_snapshot, is_favorite, source_session_id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
  if (options.programInstanceId) sessionQuery = sessionQuery.eq('program_instance_id', options.programInstanceId)
  if (options.limit) sessionQuery = sessionQuery.limit(options.limit)

  const { data: sessionRows, error } = await sessionQuery
  if (error) throw new Error(error.message)
  const rows = sessionRows ?? []
  const sessionIds = rows.map((row: any) => row.id as string)
  if (!sessionIds.length) return { sessions: [], substitutions: [] }
  const favoriteKeys = await getFavoriteLineageKeys(supabase, userId)

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from('exercise_logs')
    .select('id, session_id, planned_movement_id, performed_movement_id, role, target_summary, order_index')
    .eq('user_id', userId)
    .in('session_id', sessionIds)
    .order('order_index', { ascending: true })
  if (exerciseError) throw new Error(exerciseError.message)

  const exerciseIds = (exerciseRows ?? []).map((exercise: any) => exercise.id as string)
  const { data: setRows, error: setError } = exerciseIds.length
    ? await supabase
        .from('set_logs')
        .select('id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, actual_load, actual_reps, actual_rir, completed, is_top_set, is_amrap, is_backoff')
        .eq('user_id', userId)
        .in('exercise_log_id', exerciseIds)
        .order('set_index', { ascending: true })
    : { data: [], error: null }
  if (setError) throw new Error(setError.message)

  const { data: substitutionRows, error: substitutionError } = await supabase
    .from('substitution_logs')
    .select('id, session_id, planned_movement_id, performed_movement_id, reason, note, created_at')
    .eq('user_id', userId)
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })
  if (substitutionError) throw new Error(substitutionError.message)

  const setsByExerciseId = new Map<string, any[]>()
  for (const set of setRows ?? []) {
    const sets = setsByExerciseId.get(set.exercise_log_id) ?? []
    sets.push(set)
    setsByExerciseId.set(set.exercise_log_id, sets)
  }

  const exercisesBySessionId = new Map<string, any[]>()
  for (const exercise of exerciseRows ?? []) {
    const exercises = exercisesBySessionId.get(exercise.session_id) ?? []
    exercises.push(exercise)
    exercisesBySessionId.set(exercise.session_id, exercises)
  }

  const sessions = rows.map((row: any): HistorySessionInput => {
    const snapshot = row.prescription_snapshot as PlannedSession | null
    const exercises = exercisesBySessionId.get(row.id) ?? []
    const plannedSetCount = snapshot?.movements.reduce((total, movement) => total + movement.sets.length, 0) ?? 0
    return {
      id: row.id,
      plannedSessionId: row.planned_session_id,
      title: snapshot?.title ?? row.planned_session_id ?? 'Workout',
      programTitle: snapshot?.programTitle ?? null,
      templateId: snapshot?.templateId ?? null,
      programInstanceId: row.program_instance_id,
      scheduledDate: row.scheduled_date,
      completedAt: row.completed_at,
      units: snapshot?.units ?? null,
      weekLabel: snapshot?.weekLabel ?? null,
      weekIndex: typeof snapshot?.weekIndex === 'number' ? snapshot.weekIndex : null,
      hardness: snapshot?.hardness ?? null,
      estimatedMinutes: snapshot?.estimatedMinutes ?? null,
      movementCount: snapshot?.movements.length ?? exercises.length,
      isAdHoc: row.program_instance_id === null,
      isFavorite: Boolean(row.is_favorite) || favoriteKeys.has(sessionLineageKey(row)),
      plannedSetCount: plannedSetCount || exercises.reduce((total, exercise) => total + (setsByExerciseId.get(exercise.id)?.length ?? 0), 0),
      exercises: exercises.map((exercise: any) => ({
        id: exercise.id,
        plannedMovementId: exercise.planned_movement_id,
        performedMovementId: exercise.performed_movement_id,
        performedMovementName: getMovementName(exercise.performed_movement_id),
        role: exercise.role,
        targetSummary: exercise.target_summary,
        sets: (setsByExerciseId.get(exercise.id) ?? []).map((set: any) => ({
          id: set.id,
          setIndex: set.set_index,
          targetLoad: set.target_load === null ? null : Number(set.target_load),
          targetReps: set.target_reps,
          targetRepMin: set.target_rep_min,
          targetRepMax: set.target_rep_max,
          targetRir: set.target_rir === null ? null : Number(set.target_rir),
          actualLoad: set.actual_load === null ? null : Number(set.actual_load),
          actualReps: set.actual_reps,
          actualRir: set.actual_rir === null ? null : Number(set.actual_rir),
          completed: set.completed,
          isTopSet: set.is_top_set,
          isAmrap: set.is_amrap,
          isBackoff: set.is_backoff,
        })),
      })),
    }
  })

  const substitutions = (substitutionRows ?? []).map((row: any): HistorySubstitutionInput => ({
    id: row.id,
    sessionId: row.session_id,
    plannedMovementId: row.planned_movement_id,
    performedMovementId: row.performed_movement_id,
    reason: row.reason,
    note: row.note,
    createdAt: row.created_at,
  }))

  return { sessions, substitutions }
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function buildProgramRecentSessions(sessions: HistorySessionInput[], units: Unit): ProgramRecentSessionSummary[] {
  return sessions.slice(0, 5).map((session): ProgramRecentSessionSummary => {
    const sets = session.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ exercise, set })))
    const completedSetCount = sets.filter(({ set }) => set.completed).length
    const topSetHighlights = sets
      .filter(({ set }) => set.completed && (set.isTopSet || set.isAmrap))
      .map(({ exercise, set }) => {
        const load = typeof set.actualLoad === 'number' ? `${formatNumber(set.actualLoad)} ${session.units ?? units}` : 'bodyweight'
        return `${exercise.performedMovementName} ${load} x ${set.actualReps ?? '-'}${set.isAmrap ? '+' : ''}`
      })
      .slice(0, 3)
    return {
      id: session.id,
      title: session.title,
      completedAt: session.completedAt,
      scheduledDate: session.scheduledDate,
      weekLabel: session.weekLabel,
      completedSetCount,
      plannedSetCount: session.plannedSetCount,
      topSetHighlights,
    }
  })
}

/** Every accepted decision for the program, newest first (no dedupe — callers reconstruct history). */
async function getAcceptedDecisionsInternal(supabase: any, userId: string, programInstanceId: string): Promise<ProgressionDecision[]> {
  const { data, error } = await supabase
    .from('progression_decisions')
    .select('*')
    .eq('user_id', userId)
    .eq('program_instance_id', programInstanceId)
    .eq('status', 'accepted')
    .order('resolved_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapProgressionDecision)
}

export const getHistoryDashboardFn = createServerFn({ method: 'GET' }).handler(async (): Promise<HistoryDashboard> => {
  const { supabase, user } = await requireUser()
  const history = await getHistoryInputs(supabase, user.id, { limit: 240 })
  return buildHistoryDashboard(history)
})

export const getProgramOverviewFn = createServerFn({ method: 'GET' }).handler(async (): Promise<ProgramOverview> => {
  const today = await getTodayInternal()
  const { supabase, user } = await requireUser()
  const history = await getHistoryInputs(supabase, user.id, { limit: 240 })
  const bodyLoad = buildHistoryDashboard(history).bodyLoad
  const programHistory = today.activeProgram
    ? await getHistoryInputs(supabase, user.id, { programInstanceId: today.activeProgram.id, limit: 8 })
    : { sessions: [], substitutions: [] }
  const acceptedDecisions = today.activeProgram
    ? await getAcceptedDecisionsInternal(supabase, user.id, today.activeProgram.id)
    : []
  const sessionStamps = today.activeProgram
    ? history.sessions
        .filter((session) => session.programInstanceId === today.activeProgram!.id)
        .filter((session): session is typeof session & { weekIndex: number; completedAt: string } =>
          typeof session.weekIndex === 'number' && Boolean(session.completedAt),
        )
        .map((session) => ({ weekIndex: session.weekIndex, completedAt: session.completedAt }))
    : []
  return buildProgramOverview({
    today,
    recentSessions: buildProgramRecentSessions(programHistory.sessions, today.activeProgram?.units ?? 'kg'),
    bodyLoad,
    acceptedDecisions,
    sessionStamps,
  })
})

export const getRecentHistoryFn = createServerFn({ method: 'GET' }).handler(async (): Promise<RecentHistoryEntry[]> => {
  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, program_instance_id, planned_session_id, status, completed_at, scheduled_date, prescription_snapshot, is_favorite, source_session_id')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  const rows = data ?? []
  const favoriteKeys = await getFavoriteLineageKeys(supabase, user.id)
  const sessionIds = rows.map((row: any) => row.id as string)
  const { data: exercises, error: exerciseError } = sessionIds.length
    ? await supabase
        .from('exercise_logs')
        .select('id, session_id')
        .eq('user_id', user.id)
        .in('session_id', sessionIds)
    : { data: [], error: null }
  if (exerciseError) throw new Error(exerciseError.message)

  const exerciseToSessionId = new Map((exercises ?? []).map((exercise: any) => [exercise.id, exercise.session_id as string]))
  const exerciseIds = Array.from(exerciseToSessionId.keys())
  const { data: sets, error: setError } = exerciseIds.length
    ? await supabase
        .from('set_logs')
        .select('exercise_log_id, completed')
        .eq('user_id', user.id)
        .in('exercise_log_id', exerciseIds)
    : { data: [], error: null }
  if (setError) throw new Error(setError.message)

  const completedSetsBySessionId = new Map<string, number>()
  const loggedSetsBySessionId = new Map<string, number>()
  for (const set of sets ?? []) {
    const sessionId = exerciseToSessionId.get(set.exercise_log_id)
    if (!sessionId) continue
    loggedSetsBySessionId.set(sessionId, (loggedSetsBySessionId.get(sessionId) ?? 0) + 1)
    if (set.completed) {
      completedSetsBySessionId.set(sessionId, (completedSetsBySessionId.get(sessionId) ?? 0) + 1)
    }
  }

  return rows.map((row: any): RecentHistoryEntry => {
    const snapshot = row.prescription_snapshot as PlannedSession | null
    const plannedSetCount = snapshot?.movements.reduce((total, movement) => total + movement.sets.length, 0) ?? 0
    return {
      id: row.id,
      title: snapshot?.title ?? row.planned_session_id ?? 'Workout',
      completedAt: row.completed_at,
      scheduledDate: row.scheduled_date,
      programTitle: snapshot?.programTitle ?? null,
      weekLabel: snapshot?.weekLabel ?? null,
      hardness: snapshot?.hardness ?? null,
      estimatedMinutes: snapshot?.estimatedMinutes ?? null,
      movementCount: snapshot?.movements.length ?? 0,
      completedSetCount: completedSetsBySessionId.get(row.id) ?? 0,
      plannedSetCount: loggedSetsBySessionId.get(row.id) ?? plannedSetCount,
      isAdHoc: row.program_instance_id === null,
      isFavorite: Boolean(row.is_favorite) || favoriteKeys.has(sessionLineageKey(row)),
    }
  })
})

export const getMovementHistoryFn = createServerFn({ method: 'GET' })
  .validator((data: { movementId: string }) => data)
  .handler(async ({ data }): Promise<MovementHistoryEntry[]> => {
    const { supabase, user } = await requireUser()
    const { data: exercises, error } = await supabase
      .from('exercise_logs')
      .select('id, session_id, planned_movement_id, performed_movement_id, role, target_summary, created_at')
      .eq('user_id', user.id)
      .or(`planned_movement_id.eq.${data.movementId},performed_movement_id.eq.${data.movementId}`)
      .order('created_at', { ascending: false })
      .limit(80)
    if (error) throw new Error(error.message)

    const exerciseRows = exercises ?? []
    const exerciseIds = exerciseRows.map((exercise: any) => exercise.id as string)
    const sessionIds = Array.from(new Set(exerciseRows.map((exercise: any) => exercise.session_id as string)))
    if (!exerciseIds.length || !sessionIds.length) return []

    const { data: sessions, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id, planned_session_id, status, completed_at, scheduled_date, prescription_snapshot')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .in('id', sessionIds)
    if (sessionError) throw new Error(sessionError.message)

    const { data: setRows, error: setError } = await supabase
      .from('set_logs')
      .select('id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, actual_load, actual_reps, actual_rir, completed, is_top_set, is_amrap, is_backoff')
      .eq('user_id', user.id)
      .in('exercise_log_id', exerciseIds)
      .order('set_index', { ascending: true })
    if (setError) throw new Error(setError.message)

    const sessionsById = new Map((sessions ?? []).map((session: any) => [session.id, session]))
    const setsByExerciseId = new Map<string, any[]>()
    for (const set of setRows ?? []) {
      const sets = setsByExerciseId.get(set.exercise_log_id) ?? []
      sets.push(set)
      setsByExerciseId.set(set.exercise_log_id, sets)
    }

    return exerciseRows
      .map((exercise: any): MovementHistoryEntry | null => {
        const session = sessionsById.get(exercise.session_id)
        if (!session) return null
        const snapshot = session.prescription_snapshot as PlannedSession | null
        return {
          id: exercise.id,
          sessionId: session.id,
          sessionTitle: snapshot?.title ?? session.planned_session_id,
          programTitle: snapshot?.programTitle ?? null,
          scheduledDate: session.scheduled_date,
          completedAt: session.completed_at,
          units: snapshot?.units ?? null,
          plannedMovementId: exercise.planned_movement_id,
          performedMovementId: exercise.performed_movement_id,
          performedMovementName: getMovementName(exercise.performed_movement_id),
          role: exercise.role,
          targetSummary: exercise.target_summary,
          sets: (setsByExerciseId.get(exercise.id) ?? []).map((set: any) => ({
            id: set.id,
            setIndex: set.set_index,
            targetLoad: set.target_load === null ? null : Number(set.target_load),
            targetReps: set.target_reps,
            targetRepMin: set.target_rep_min,
            targetRepMax: set.target_rep_max,
            targetRir: set.target_rir === null ? null : Number(set.target_rir),
            actualLoad: set.actual_load === null ? null : Number(set.actual_load),
            actualReps: set.actual_reps,
            actualRir: set.actual_rir === null ? null : Number(set.actual_rir),
            completed: set.completed,
            isTopSet: set.is_top_set,
            isAmrap: set.is_amrap,
            isBackoff: set.is_backoff,
          })),
        }
      })
      .filter((entry): entry is MovementHistoryEntry => entry !== null)
      .sort((left, right) => {
        const leftDate = left.completedAt ?? left.scheduledDate
        const rightDate = right.completedAt ?? right.scheduledDate
        return rightDate.localeCompare(leftDate)
      })
      .slice(0, 12)
  })
