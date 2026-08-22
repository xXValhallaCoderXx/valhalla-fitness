import type { z } from 'zod'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types'
import type { Unit } from '@sheetless/domain/shared/types'
import {
  buildAdHocSnapshot,
  normalizeAdHocTitle,
  seedMovementsFromSource,
} from '@sheetless/domain/session/ad-hoc'
import {
  renameSessionInputSchema,
  sessionIdInputSchema,
  startAdHocSessionInputSchema,
  startSessionInputSchema,
} from '@sheetless/domain/session/schemas'
import type { Json } from '@sheetless/domain/shared/types/database'
import { calendarDateInTimeZone, resolveIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import { ensureProfile } from '../account/profile'
import { getSession, getToday } from './reads'
import { getPreviousComparablesBySlotId } from './previous-comparables'
import type { UserContext } from '../shared/context'

export async function startSession(
  ctx: UserContext,
  data: z.infer<typeof startSessionInputSchema>,
): Promise<WorkoutSession> {
  const today = await getToday(ctx, data.timeZone)
  if (!today.activeProgram || !today.plannedSession) throw new Error('No planned session')
  if (today.activeSession) return today.activeSession
  if (today.pendingDecisions.length > 0) {
    throw new Error('Resolve your pending progression changes before starting the next session.')
  }
  const { data: sessionId, error } = await ctx.supabase.rpc('start_session_v2', {
    p_client_mutation_id: data.clientMutationId,
    p_program_instance_id: today.activeProgram.id,
    p_planned_session_id: today.plannedSession.id,
    p_scheduled_date: today.plannedSession.scheduledDate,
    p_prescription_snapshot: today.plannedSession as unknown as Json,
    p_expected_program_version: today.activeProgram.stateVersion,
    p_source_session_id: null,
  })
  if (error) throw new Error(error.message)
  return getSession(ctx, sessionId)
}

export async function startAdHocSession(
  ctx: UserContext,
  data: z.infer<typeof startAdHocSessionInputSchema>,
): Promise<WorkoutSession> {
  const { supabase, user } = ctx

  // Never two live sessions: an existing in-progress workout (plan or ad-hoc) wins.
  const { data: activeRow, error: activeError } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (activeError) throw new Error(activeError.message)
  if (activeRow) return getSession(ctx, activeRow.id)

  const profile = await ensureProfile(ctx)
  const timeZone = resolveIanaTimeZone(data.timeZone ?? profile.timezone)
  const scheduledDate = calendarDateInTimeZone(new Date(), timeZone)

  let title: string | null = null
  let movements: MovementSlot[] = []
  let lineageRootId: string | null = null
  if (data.sourceSessionId) {
    const source = await getSession(ctx, data.sourceSessionId)
    if (!source.isAdHoc) throw new Error('Only ad-hoc workouts can be repeated.')
    title = source.title
    movements = seedMovementsFromSource(source)
    // Flatten repeat chains: every instance points at the lineage root, so favourite
    // state stays shared no matter which instance was repeated.
    lineageRootId = source.sourceSessionId ?? source.sessionId
  }

  const snapshot = buildAdHocSnapshot({
    title,
    scheduledDate,
    timeZone,
    units: (profile.units as Unit) ?? 'kg',
    rounding: Number(profile.rounding) || 2.5,
    movements,
  })
  if (snapshot.movements.length) {
    const previousBySlotId = await getPreviousComparablesBySlotId(supabase, user.id, snapshot)
    snapshot.movements = snapshot.movements.map((movement) => ({
      ...movement,
      previous: previousBySlotId[movement.slotId ?? movement.id] ?? null,
    }))
  }

  const { data: sessionId, error } = await supabase.rpc('start_ad_hoc_session_v2', {
    p_client_mutation_id: data.clientMutationId,
    p_scheduled_date: scheduledDate,
    p_prescription_snapshot: snapshot as unknown as Json,
    p_source_session_id: lineageRootId,
  })
  if (error) throw new Error(error.message)
  return getSession(ctx, sessionId)
}

export async function renameSession(
  ctx: UserContext,
  data: z.infer<typeof renameSessionInputSchema>,
): Promise<WorkoutSession> {
  const title = normalizeAdHocTitle(data.title)
  if (!title) throw new Error('Enter a workout name.')

  const { error } = await ctx.supabase.rpc('rename_session_v2', {
    p_session_id: data.sessionId,
    p_title: title,
    p_request_id: data.requestId,
    p_expected_state_version: data.expectedStateVersion,
  })
  if (error) throw new Error(error.message)
  return getSession(ctx, data.sessionId)
}

export async function discardSession(
  ctx: UserContext,
  data: z.infer<typeof sessionIdInputSchema>,
): Promise<{ sessionId: string }> {
  const { data: discardedSessionId, error } = await ctx.supabase.rpc('discard_workout_session', {
    p_session_id: data.sessionId,
  })
  if (error) throw new Error(error.message)
  if (discardedSessionId !== data.sessionId) throw new Error('Workout could not be discarded.')
  return { sessionId: discardedSessionId }
}
