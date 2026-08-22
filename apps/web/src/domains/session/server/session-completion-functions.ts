import { createServerFn } from '@tanstack/react-start'
import type { ProgramInstance, ProgressionDecision } from '~/domains/program'
import type { SessionPr, SessionSummary, WorkoutSession } from '~/domains/session'
import {
  buildPriorBests,
  detectSessionPrs,
  type PriorBests,
  type PriorSetSample,
} from '~/domains/session/lib/session-prs'
import {
  collectChunkedSessionQueryPages,
  collectSessionQueryPages,
} from '~/domains/session/lib/session-query-pages'
import {
  normalizeReflection,
  normalizeSessionRpe,
} from '~/domains/session/lib/session-reflection'
import {
  accessoryOutcomeSummary,
  buildProgressionDecisionsForSession,
} from '~/domains/program/lib/progression-decisions'
import { finishSessionInputSchema } from '~/domains/session/lib/schemas'
import type { Json } from '~/shared/types/database'
import type { SupabaseServerClient } from '~/shared/server/supabase'
import {
  getActiveProgramInternal,
  getPendingDecisionsInternal,
} from '~/domains/program/server/program-functions'
import { getSessionInternal } from '~/domains/session/server/session-read-functions'
import { requireSessionUser } from '~/domains/session/server/session-server'

/**
 * Prior working-set bests per movement across all other completed sessions,
 * for finish-time PR detection. Excludes the finishing session explicitly on
 * top of the completed-status filter, so it is safe to call at any point of
 * the finish flow.
 */
async function getPriorBestsByMovement(
  supabase: SupabaseServerClient,
  userId: string,
  movementIds: string[],
  excludeSessionId: string,
): Promise<Record<string, PriorBests>> {
  if (!movementIds.length) return {}

  const exerciseRows = await collectSessionQueryPages((from, to) =>
    supabase
      .from('exercise_logs')
      .select('id, session_id, performed_movement_id')
      .eq('user_id', userId)
      .in('performed_movement_id', movementIds)
      .neq('session_id', excludeSessionId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to),
  )
  if (!exerciseRows.length) return {}

  const sessionIds = Array.from(new Set(exerciseRows.map((exercise) => exercise.session_id)))
  const sessionRows = await collectChunkedSessionQueryPages(sessionIds, (idChunk, from, to) =>
    supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .in('id', idChunk)
      .order('id', { ascending: true })
      .range(from, to),
  )

  const completedSessionIds = new Set(sessionRows.map((session) => session.id))
  const completedExerciseRows = exerciseRows.filter((exercise) => completedSessionIds.has(exercise.session_id))
  if (!completedExerciseRows.length) return {}

  const exerciseIds = completedExerciseRows.map((exercise) => exercise.id)
  // Every child lookup is both id-chunked and paginated: a high-volume
  // training history must never be silently truncated into a false PR.
  const setRows = await collectChunkedSessionQueryPages(exerciseIds, (idChunk, from, to) =>
    supabase
      .from('set_logs')
      .select('id, exercise_log_id, actual_load, actual_reps, actual_rir, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('exercise_log_id', idChunk)
      .order('exercise_log_id', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  )

  const movementByExerciseId = new Map(
    completedExerciseRows.map((exercise) => [exercise.id, exercise.performed_movement_id]),
  )
  const samplesByMovement: Record<string, PriorSetSample[]> = {}
  for (const row of setRows) {
    if (!row.completed) continue
    const load = row.actual_load === null ? null : Number(row.actual_load)
    const reps = row.actual_reps
    if (load === null || load <= 0 || reps === null || reps <= 0) continue
    const movementId = movementByExerciseId.get(row.exercise_log_id)
    if (!movementId) continue
    ;(samplesByMovement[movementId] ??= []).push({
      load,
      reps,
      rir: row.actual_rir === null ? null : Number(row.actual_rir),
    })
  }
  return Object.fromEntries(
    Object.entries(samplesByMovement).map(([movementId, samples]) => [movementId, buildPriorBests(samples)]),
  )
}

export const finishSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => finishSessionInputSchema.parse(data))
  .handler(async ({ data }): Promise<SessionSummary> => {
    const session = await getSessionInternal(data.sessionId)
    if (session.status === 'completed') {
      const { supabase } = await requireSessionUser()
      const { error: replayError } = await supabase.rpc('finish_session_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.requestId,
        p_notes: normalizeReflection(data.notes),
        p_session_rpe: normalizeSessionRpe(data.sessionRpe),
        p_reflection_win: normalizeReflection(data.reflectionWin),
        p_reflection_improve: normalizeReflection(data.reflectionImprove),
        p_prs: (session.prs ?? []) as unknown as Json,
        p_decisions: [],
        p_expected_program_version: null,
        p_expected_session_version: Math.max(0, session.stateVersion - 1),
      })
      if (replayError) throw new Error(replayError.message)
      const decisions = session.isAdHoc ? [] : await getPendingDecisionsInternal()
      return sessionSummaryFromSession(session, decisions)
    }
    if (session.status !== 'in_progress') throw new Error('Only in-progress sessions can be finished')
    const { supabase, user } = await requireSessionUser()

    // PR detection runs before the status flip so the completed-sessions filter
    // naturally excludes this session — and must never block finishing.
    let prs: SessionPr[] = []
    try {
      const movementIds = Array.from(
        new Set(
          session.movements
            .filter((movement) => movement.sets.some((set) => set.completed))
            .map((movement) => movement.performedMovementId ?? movement.movementId),
        ),
      )
      const priorBests = await getPriorBestsByMovement(supabase, user.id, movementIds, data.sessionId)
      prs = detectSessionPrs(session, priorBests)
    } catch (error) {
      console.error('PR detection failed; finishing without records', error)
      prs = []
    }

    // Ad-hoc sessions live outside the programme: no progression decisions, no week advance.
    let activeProgram: ProgramInstance | null = null
    let decisions: ProgressionDecision[] = []
    if (!session.isAdHoc) {
      activeProgram = await getActiveProgramInternal()
      if (!activeProgram) throw new Error('No active program')
      decisions = buildProgressionDecisionsForSession(session, activeProgram)
    }

    const decisionPayload = decisions.map((decision) => ({
      movementId: decision.movementId,
      ruleId: decision.ruleId,
      scope: decision.scope,
      inputSummary: decision.inputSummary,
      recommendation: decision.recommendation,
      stateKey: decision.stateKey,
      stateType: decision.stateType,
      previousValue: decision.previousValue,
      recommendedValue: decision.recommendedValue,
    }))
    const { error: finishError } = await supabase.rpc('finish_session_v2', {
      p_session_id: data.sessionId,
      p_request_id: data.requestId,
      p_notes: normalizeReflection(data.notes),
      p_session_rpe: normalizeSessionRpe(data.sessionRpe),
      p_reflection_win: normalizeReflection(data.reflectionWin),
      p_reflection_improve: normalizeReflection(data.reflectionImprove),
      p_prs: prs as unknown as Json,
      p_decisions: decisionPayload as unknown as Json,
      p_expected_program_version: activeProgram?.stateVersion ?? null,
      p_expected_session_version: session.stateVersion,
    })
    if (finishError) throw new Error(finishError.message)

    const completedSession = await getSessionInternal(data.sessionId)
    const insertedDecisions = activeProgram ? await getPendingDecisionsInternal(activeProgram.id) : []
    return sessionSummaryFromSession(completedSession, insertedDecisions)
  })

function sessionSummaryFromSession(
  session: WorkoutSession,
  decisions: ProgressionDecision[],
): SessionSummary {
  const sets = session.movements.flatMap((movement) => movement.sets)
  return {
    session,
    completedSets: sets.filter((set) => set.completed).length,
    totalSets: sets.length,
    topSets: sets.filter((set) => set.isTopSet || set.isAmrap),
    accessoryOutcomes: session.movements
      .filter((movement) => movement.role === 'accessory')
      .map((movement) => `${movement.movementName}: ${accessoryOutcomeSummary(movement)}`),
    decisions,
  }
}
