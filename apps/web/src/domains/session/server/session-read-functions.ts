import { createServerFn } from '@tanstack/react-start'
import type {
  PlannedSession,
  SessionPr,
  SetLog,
  TodayPayload,
  WorkoutSession,
} from '~/domains/session'
import { sessionLineageKey } from '~/domains/session/lib/ad-hoc'
import { ensureProfile } from '~/domains/account/server/profile-functions'
import { expandPlannedSession, programForNextUncompletedSession } from '~/domains/program/lib/templates'
import { getMovementName } from '~/domains/movement/lib/movements'
import { sessionIdInputSchema } from '~/domains/session/lib/schemas'
import { getPreviousComparablesBySlotId } from '~/domains/session/server/previous-comparables'
import {
  calendarDateInTimeZone,
  resolveIanaTimeZone,
} from '~/shared/lib/calendar-date'
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
  const resolvedTimeZone = resolveIanaTimeZone(timeZone ?? profile.timezone)
  const scheduledDate = calendarDateInTimeZone(new Date(), resolvedTimeZone)

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

  const barePlannedSession = {
    ...expandPlannedSession(activeProgram, scheduledDate, templateDefinition),
    timeZone: resolvedTimeZone,
  }
  const plannedSession = {
    ...expandPlannedSession(
      activeProgram,
      scheduledDate,
      templateDefinition,
      await getPreviousComparablesBySlotId(supabase, user.id, barePlannedSession),
    ),
    timeZone: resolvedTimeZone,
  }
  const pendingDecisions = await getPendingDecisionsInternal(activeProgram.id)

  return {
    activeProgram,
    plannedSession,
    activeSession,
    completedSession,
    pendingDecisions,
  }
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
