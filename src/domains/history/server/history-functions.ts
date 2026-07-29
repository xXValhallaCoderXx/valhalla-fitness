import { createServerFn } from '@tanstack/react-start'
import type { BodyweightEntry, Sex } from '~/domains/account'
import type {
  HistoryDashboardWithInsights,
  MovementHistoryEntry,
  RecentHistoryEntry,
} from '~/domains/history'
import type { ProgramOverview, ProgramRecentSessionSummary, ProgressionDecision } from '~/domains/program'
import type { PlannedSession, SubstitutionReason } from '~/domains/session'
import type { MovementRole, Unit } from '~/shared/types'
import {
  buildHistoryDashboard,
  buildRecentHistoryEntries,
  type HistorySessionInput,
  type HistorySubstitutionInput,
} from '~/domains/history/lib/history'
import { buildHistoryInsights } from '~/domains/history/lib/build-insights'
import { collectPostgrestPages } from '~/domains/history/lib/postgrest-pagination'
import { movementHistoryInputSchema } from '~/domains/history/lib/schemas'
import {
  buildTodayHistorySupport,
  todayHistoryWindowStart,
} from '~/domains/history/lib/today-history-support'
import type { TodayHistorySupport } from '~/domains/history/types'
import { buildProgramOverview } from '~/domains/program/lib/program-overview'
import { getMovementName } from '~/domains/movement/lib/movements'
import { externalLoadOrNull } from '~/shared/lib/load'
import { formatNumber } from '~/shared/lib/set-notation'
import type { SupabaseServerClient } from '~/shared/server/supabase'
import { mapProgressionDecision } from '~/domains/program/server/program-functions'
import { favoriteLineageKeys, sessionLineageKey } from '~/domains/session/lib/ad-hoc'
import { getTodayInternal } from '~/domains/session/server/session-functions'
import { getMovementHistoryEntries } from '~/domains/history/server/movement-history'
import {
  calendarDateInTimeZone,
  calendarDateToUtcDate,
  resolveIanaTimeZone,
} from '~/shared/lib/calendar-date'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

const IN_CHUNK_SIZE = 150
const IN_CHUNK_CONCURRENCY = 4

async function chunkedIn<T>(
  ids: string[],
  fetchChunkPage: (
    chunk: string[],
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  const chunks: string[][] = []
  for (let start = 0; start < ids.length; start += IN_CHUNK_SIZE) {
    chunks.push(ids.slice(start, start + IN_CHUNK_SIZE))
  }
  for (let start = 0; start < chunks.length; start += IN_CHUNK_CONCURRENCY) {
    const results = await Promise.all(
      chunks
        .slice(start, start + IN_CHUNK_CONCURRENCY)
        .map((chunk) => collectPostgrestPages((from, to) => fetchChunkPage(chunk, from, to))),
    )
    for (const chunkRows of results) {
      rows.push(...chunkRows)
    }
  }
  return rows
}

/** Lineage keys of the user's favourited workouts — repeats of a favourite show its star. */
async function getFavoriteLineageKeys(supabase: SupabaseServerClient, userId: string): Promise<Set<string>> {
  const rows = await collectPostgrestPages((from, to) =>
    supabase
      .from('workout_sessions')
      .select('id, source_session_id')
      .eq('user_id', userId)
      .eq('is_favorite', true)
      .order('id', { ascending: true })
      .range(from, to),
  )
  return favoriteLineageKeys(rows)
}

export async function getHistoryInputs(
  supabase: SupabaseServerClient,
  userId: string,
  options: {
    programInstanceId?: string
    limit?: number
    scheduledAfter?: string
    includeFavorites?: boolean
    includeSubstitutions?: boolean
  } = {},
): Promise<{ sessions: HistorySessionInput[]; substitutions: HistorySubstitutionInput[] }> {
  const rows = await collectPostgrestPages(
    (from, to) => {
      let sessionQuery = supabase
        .from('workout_sessions')
        .select('id, program_instance_id, planned_session_id, status, completed_at, scheduled_date, prescription_snapshot, is_favorite, source_session_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
      if (options.programInstanceId) {
        sessionQuery = sessionQuery.eq('program_instance_id', options.programInstanceId)
      }
      if (options.scheduledAfter) {
        sessionQuery = sessionQuery.gte('scheduled_date', options.scheduledAfter)
      }
      return sessionQuery
        .order('scheduled_date', { ascending: false })
        .order('completed_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    },
    { limit: options.limit },
  )
  const sessionIds = rows.map((row) => row.id)
  if (!sessionIds.length) return { sessions: [], substitutions: [] }
  const favoriteKeys = options.includeFavorites === false
    ? new Set<string>()
    : await getFavoriteLineageKeys(supabase, userId)

  // Children of a parent id always land in that id's chunk, so per-session /
  // per-exercise ordering survives chunk concatenation.
  const exerciseRows = await chunkedIn(sessionIds, (chunk, from, to) =>
    supabase
      .from('exercise_logs')
      .select('id, session_id, planned_movement_id, performed_movement_id, role, target_summary, order_index')
      .eq('user_id', userId)
      .in('session_id', chunk)
      .order('session_id', { ascending: true })
      .order('order_index', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )

  const exerciseIds = exerciseRows.map((exercise) => exercise.id)
  const setRows = await chunkedIn(exerciseIds, (chunk, from, to) =>
    supabase
      .from('set_logs')
      .select('id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, actual_load, actual_reps, actual_rir, completed, is_top_set, is_amrap, is_backoff')
      .eq('user_id', userId)
      .in('exercise_log_id', chunk)
      .order('exercise_log_id', { ascending: true })
      .order('set_index', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )

  const substitutionRows = options.includeSubstitutions === false
    ? []
    : await chunkedIn(sessionIds, (chunk, from, to) =>
        supabase
          .from('substitution_logs')
          .select('id, session_id, planned_movement_id, performed_movement_id, reason, note, created_at')
          .eq('user_id', userId)
          .in('session_id', chunk)
          .order('session_id', { ascending: true })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to),
      )

  const setsByExerciseId = new Map<string, typeof setRows>()
  for (const set of setRows ?? []) {
    const sets = setsByExerciseId.get(set.exercise_log_id) ?? []
    sets.push(set)
    setsByExerciseId.set(set.exercise_log_id, sets)
  }

  const exercisesBySessionId = new Map<string, typeof exerciseRows>()
  for (const exercise of exerciseRows ?? []) {
    const exercises = exercisesBySessionId.get(exercise.session_id) ?? []
    exercises.push(exercise)
    exercisesBySessionId.set(exercise.session_id, exercises)
  }

  const sessions = rows.map((row): HistorySessionInput => {
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
      timeZone: snapshot?.timeZone ?? null,
      units: snapshot?.units ?? null,
      weekLabel: snapshot?.weekLabel ?? null,
      weekIndex: typeof snapshot?.weekIndex === 'number' ? snapshot.weekIndex : null,
      hardness: snapshot?.hardness ?? null,
      estimatedMinutes: snapshot?.estimatedMinutes ?? null,
      movementCount: snapshot?.movements.length ?? exercises.length,
      isAdHoc: row.program_instance_id === null,
      isFavorite: Boolean(row.is_favorite) || favoriteKeys.has(sessionLineageKey(row)),
      plannedSetCount: plannedSetCount || exercises.reduce((total, exercise) => total + (setsByExerciseId.get(exercise.id)?.length ?? 0), 0),
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        plannedMovementId: exercise.planned_movement_id,
        performedMovementId: exercise.performed_movement_id,
        performedMovementName: getMovementName(exercise.performed_movement_id),
        role: exercise.role as MovementRole,
        targetSummary: exercise.target_summary,
        sets: (setsByExerciseId.get(exercise.id) ?? []).map((set) => ({
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

  const substitutions = (substitutionRows ?? []).map((row): HistorySubstitutionInput => ({
    id: row.id,
    sessionId: row.session_id,
    plannedMovementId: row.planned_movement_id,
    performedMovementId: row.performed_movement_id,
    reason: row.reason as SubstitutionReason,
    note: row.note,
    createdAt: row.created_at,
  }))

  return { sessions, substitutions }
}

function buildProgramRecentSessions(sessions: HistorySessionInput[], units: Unit): ProgramRecentSessionSummary[] {
  return sessions.slice(0, 5).map((session): ProgramRecentSessionSummary => {
    const sets = session.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ exercise, set })))
    const completedSetCount = sets.filter(({ set }) => set.completed).length
    const topSetHighlights = sets
      .filter(({ set }) => set.completed && (set.isTopSet || set.isAmrap))
      .map(({ exercise, set }) => {
        const externalLoad = externalLoadOrNull(set.actualLoad)
        const load =
          externalLoad == null
            ? 'bodyweight'
            : `${formatNumber(externalLoad)} ${session.units ?? units}`
        return `${exercise.performedMovementName} ${load} x ${set.actualReps ?? '-'}${set.isAmrap ? '+' : ''}`
      })
      .slice(0, 3)
    return {
      id: session.id,
      title: session.title,
      completedAt: session.completedAt,
      scheduledDate: session.scheduledDate,
      timeZone: session.timeZone,
      weekLabel: session.weekLabel,
      completedSetCount,
      plannedSetCount: session.plannedSetCount,
      topSetHighlights,
    }
  })
}

/** Every accepted decision for the program, newest first (no dedupe — callers reconstruct history). */
async function getAcceptedDecisionsInternal(supabase: SupabaseServerClient, userId: string, programInstanceId: string): Promise<ProgressionDecision[]> {
  const rows = await collectPostgrestPages((from, to) =>
    supabase
      .from('progression_decisions')
      .select('*')
      .eq('user_id', userId)
      .eq('program_instance_id', programInstanceId)
      .eq('status', 'accepted')
      .order('resolved_at', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to),
  )
  return rows.map(mapProgressionDecision)
}

async function getBodyweightEntriesInternal(supabase: SupabaseServerClient, userId: string): Promise<BodyweightEntry[]> {
  const rows = await collectPostgrestPages((from, to) =>
    supabase
      .from('bodyweight_entries')
      .select('id, recorded_on, weight_kg')
      .eq('user_id', userId)
      .order('recorded_on', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )
  return rows.map((row): BodyweightEntry => ({
    id: row.id,
    recordedOn: row.recorded_on,
    weightKg: Number(row.weight_kg),
  }))
}

async function getProfileHistoryContext(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<{ sex: Sex | null; timeZone: string }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('sex, timezone')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return {
    sex: (data?.sex as Sex | undefined) ?? null,
    timeZone: resolveIanaTimeZone(data?.timezone),
  }
}

export const getHistoryDashboardFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HistoryDashboardWithInsights> => {
    const { supabase, user } = await requireUser()
    const generatedAt = new Date()
    const [history, bodyweightEntries, profile] = await Promise.all([
      getHistoryInputs(supabase, user.id),
      getBodyweightEntriesInternal(supabase, user.id),
      getProfileHistoryContext(supabase, user.id),
    ])
    const today = calendarDateInTimeZone(generatedAt, profile.timeZone)
    const dashboard = buildHistoryDashboard({
      ...history,
      now: calendarDateToUtcDate(today) ?? generatedAt,
    })
    const insights = buildHistoryInsights({
      sessions: history.sessions,
      overview: dashboard.overview,
      bodyweightEntries,
      sex: profile.sex,
      now: generatedAt.toISOString(),
      today,
      timeZone: profile.timeZone,
    })
    return { ...dashboard, insights }
  },
)

export const getTodayHistorySupportFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TodayHistorySupport> => {
    const { supabase, user } = await requireUser()
    const now = new Date()
    const profile = await getProfileHistoryContext(supabase, user.id)
    const today = calendarDateInTimeZone(now, profile.timeZone)
    const scheduledAfter = todayHistoryWindowStart(today)
    const [history, completedSession] = await Promise.all([
      getHistoryInputs(supabase, user.id, {
        scheduledAfter,
        includeFavorites: false,
        includeSubstitutions: false,
      }),
      supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })
        .order('completed_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    if (completedSession.error) throw new Error(completedSession.error.message)

    return buildTodayHistorySupport({
      sessions: history.sessions,
      hasCompletedSessions: Boolean(completedSession.data),
      now,
      today,
    })
  },
)

export const getProgramOverviewFn = createServerFn({ method: 'GET' }).handler(async (): Promise<ProgramOverview> => {
  const today = await getTodayInternal()
  const { supabase, user } = await requireUser()
  const [history, profile] = await Promise.all([
    getHistoryInputs(supabase, user.id, { limit: 240 }),
    getProfileHistoryContext(supabase, user.id),
  ])
  const accountToday = calendarDateInTimeZone(new Date(), profile.timeZone)
  const bodyLoad = buildHistoryDashboard({
    ...history,
    now: calendarDateToUtcDate(accountToday) ?? new Date(),
  }).bodyLoad
  const programSessions = today.activeProgram
    ? history.sessions
        .filter((session) => session.programInstanceId === today.activeProgram!.id)
        .slice(0, 8)
    : []
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
    recentSessions: buildProgramRecentSessions(programSessions, today.activeProgram?.units ?? 'kg'),
    bodyLoad,
    acceptedDecisions,
    sessionStamps,
  })
})

export const getRecentHistoryFn = createServerFn({ method: 'GET' }).handler(async (): Promise<RecentHistoryEntry[]> => {
  const { supabase, user } = await requireUser()
  const history = await getHistoryInputs(supabase, user.id, {
    limit: 20,
    includeSubstitutions: false,
  })
  return buildRecentHistoryEntries(history.sessions)
})

export const getMovementHistoryFn = createServerFn({ method: 'GET' })
  .validator((data) => movementHistoryInputSchema.parse(data))
  .handler(async ({ data }): Promise<MovementHistoryEntry[]> => {
    const { supabase, user } = await requireUser()
    return getMovementHistoryEntries(supabase, user.id, data.movementId)
  })
