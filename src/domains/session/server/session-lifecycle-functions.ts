import { createServerFn } from '@tanstack/react-start'
import type { MovementSlot, WorkoutSession } from '~/domains/session'
import type { Unit } from '~/shared/types'
import {
  buildAdHocSnapshot,
  normalizeAdHocTitle,
  seedMovementsFromSource,
} from '~/domains/session/lib/ad-hoc'
import { ensureProfile } from '~/domains/account/server/profile-functions'
import {
  renameSessionInputSchema,
  sessionIdInputSchema,
  startAdHocSessionInputSchema,
  startSessionInputSchema,
} from '~/domains/session/lib/schemas'
import type { Json } from '~/shared/types/database'
import { calendarDateInTimeZone } from '~/shared/lib/calendar-date'
import {
  getPreviousComparablesBySlotId,
  getSessionInternal,
  getTodayInternal,
} from '~/domains/session/server/session-read-functions'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const startSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => startSessionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const today = await getTodayInternal(data.timeZone)
    if (!today.activeProgram || !today.plannedSession) throw new Error('No planned session')
    if (today.activeSession) return today.activeSession
    if (today.pendingDecisions.length > 0) {
      throw new Error('Resolve your pending progression changes before starting the next session.')
    }
    const { supabase } = await requireSessionUser()
    const { data: sessionId, error } = await supabase.rpc('start_session_v2', {
      p_client_mutation_id: data.clientMutationId,
      p_program_instance_id: today.activeProgram.id,
      p_planned_session_id: today.plannedSession.id,
      p_scheduled_date: today.plannedSession.scheduledDate,
      p_prescription_snapshot: today.plannedSession as unknown as Json,
      p_expected_program_version: today.activeProgram.stateVersion,
      p_source_session_id: null,
    })
    if (error) throw new Error(error.message)
    return getSessionInternal(sessionId)
  })

export const startAdHocSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => startAdHocSessionInputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkoutSession> => {
    const { supabase, user } = await requireSessionUser()

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
    if (activeRow) return getSessionInternal(activeRow.id)

    const profile = await ensureProfile()
    const scheduledDate = calendarDateInTimeZone(new Date(), data.timeZone ?? profile.timezone)

    let title: string | null = null
    let movements: MovementSlot[] = []
    let lineageRootId: string | null = null
    if (data.sourceSessionId) {
      const source = await getSessionInternal(data.sourceSessionId)
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
    return getSessionInternal(sessionId)
  })

export const renameSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => renameSessionInputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkoutSession> => {
    const { supabase } = await requireSessionUser()
    const title = normalizeAdHocTitle(data.title)
    if (!title) throw new Error('Enter a workout name.')

    const { error } = await supabase.rpc('rename_session_v2', {
      p_session_id: data.sessionId,
      p_title: title,
      p_request_id: data.requestId,
      p_expected_state_version: data.expectedStateVersion,
    })
    if (error) throw new Error(error.message)
    return getSessionInternal(data.sessionId)
  })

export const discardSessionFn = createServerFn({ method: 'POST' })
  .validator((data) => sessionIdInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ sessionId: string }> => {
    const { supabase } = await requireSessionUser()
    const { data: discardedSessionId, error } = await supabase.rpc('discard_workout_session', {
      p_session_id: data.sessionId,
    })
    if (error) throw new Error(error.message)
    if (discardedSessionId !== data.sessionId) throw new Error('Workout could not be discarded.')
    return { sessionId: discardedSessionId }
  })
