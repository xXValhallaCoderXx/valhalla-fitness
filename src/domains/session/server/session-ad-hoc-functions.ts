import { createServerFn } from '@tanstack/react-start'
import type { PlannedSession, WorkoutSession } from '~/domains/session'
import {
  AD_HOC_DEFAULT_SET_COUNT,
  buildAdHocMovementSlot,
  nextAdHocSlotId,
} from '~/domains/session/lib/ad-hoc'
import {
  addAdHocExerciseInputSchema,
  removeAdHocExerciseInputSchema,
} from '~/domains/session/lib/schemas'
import { getMovementCatalogForSwap } from '~/domains/movement/server/movement-functions'
import type { Json } from '~/shared/types/database'
import { getSessionInternal } from '~/domains/session/server/session-read-functions'
import { getPreviousComparablesBySlotId } from '~/domains/session/server/previous-comparables'
import { requireSessionUser } from '~/domains/session/server/session-server'

export const addAdHocExerciseFn = createServerFn({ method: 'POST' })
  .validator((data) => addAdHocExerciseInputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkoutSession> => {
    const { supabase, user } = await requireSessionUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    const intent = { movementId: data.movementId }
    if (
      sessionRow.status !== 'in_progress' ||
      Number(sessionRow.state_version) !== data.expectedStateVersion
    ) {
      const { error: replayError } = await supabase.rpc('add_ad_hoc_exercise_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.clientMutationId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_exercise: null,
        p_sets: null,
        p_next_snapshot: null,
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }
    if (sessionRow.program_instance_id !== null) {
      throw new Error('Exercises can only be added freely to ad-hoc workouts.')
    }
    const { data: exerciseRows, error: exerciseRowsError } = await supabase
      .from('exercise_logs')
      .select('id, slot_id, order_index')
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })
    if (exerciseRowsError) throw new Error(exerciseRowsError.message)

    const catalog = await getMovementCatalogForSwap(supabase)
    const movement = catalog[data.movementId]
    if (!movement) throw new Error('Unknown movement.')

    const snapshot = sessionRow.prescription_snapshot as PlannedSession
    const usedSlotIds = new Set<string>((exerciseRows ?? []).map((row) => row.slot_id))
    for (const snapshotSlot of snapshot.movements) usedSlotIds.add(snapshotSlot.slotId ?? snapshotSlot.id)
    const slotId = nextAdHocSlotId(usedSlotIds, movement.id)
    const hasMovements = (exerciseRows ?? []).length > 0 || snapshot.movements.length > 0
    const orderIndex = hasMovements
      ? Math.max(
          0,
          ...(exerciseRows ?? []).map((row) => Number(row.order_index) || 0),
          ...snapshot.movements.map((item) => Number(item.orderIndex) || 0),
        ) + 1
      : 0

    const slot = buildAdHocMovementSlot({
      slotId,
      movementId: movement.id,
      movementName: movement.name,
      role: movement.isCompetition ? 'main' : 'accessory',
      orderIndex,
      setCount: AD_HOC_DEFAULT_SET_COUNT,
    })
    const previousBySlotId = await getPreviousComparablesBySlotId(supabase, user.id, {
      ...snapshot,
      movements: [slot],
    })
    slot.previous = previousBySlotId[slotId] ?? null

    const nextSnapshot: PlannedSession = {
      ...snapshot,
      movements: [...snapshot.movements, slot],
    }
    const { error: mutationError } = await supabase.rpc('add_ad_hoc_exercise_v2', {
      p_session_id: data.sessionId,
      p_request_id: data.clientMutationId,
      p_expected_state_version: data.expectedStateVersion,
      p_intent: intent,
      p_exercise: {
        slotId,
        movementId: movement.id,
        role: slot.role,
        orderIndex,
        targetSummary: slot.targetSummary,
      },
      p_sets: slot.sets as unknown as Json,
      p_next_snapshot: nextSnapshot as unknown as Json,
    })
    if (mutationError) throw new Error(mutationError.message)

    return getSessionInternal(data.sessionId)
  })

export const removeAdHocExerciseFn = createServerFn({ method: 'POST' })
  .validator((data) => removeAdHocExerciseInputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkoutSession> => {
    const { supabase, user } = await requireSessionUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    const intent = { exerciseLogId: data.exerciseLogId }
    if (
      sessionRow.status !== 'in_progress' ||
      Number(sessionRow.state_version) !== data.expectedStateVersion
    ) {
      const { error: replayError } = await supabase.rpc('remove_ad_hoc_exercise_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.requestId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_exercise_log_id: data.exerciseLogId,
        p_next_snapshot: null,
        p_exercise_orders: null,
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }
    if (sessionRow.program_instance_id !== null) {
      throw new Error('Exercises can only be removed from ad-hoc workouts.')
    }

    const { data: exerciseRow, error: exerciseError } = await supabase
      .from('exercise_logs')
      .select('id, slot_id')
      .eq('id', data.exerciseLogId)
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (exerciseError) throw new Error(exerciseError.message)

    const snapshot = sessionRow.prescription_snapshot as PlannedSession
    if (!exerciseRow) {
      const { error: replayError } = await supabase.rpc('remove_ad_hoc_exercise_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.requestId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_exercise_log_id: data.exerciseLogId,
        p_next_snapshot: snapshot as unknown as Json,
        p_exercise_orders: [],
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }
    const remainingMovements = snapshot.movements
      .filter((movement) => (movement.slotId ?? movement.id) !== exerciseRow.slot_id)
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((movement, index) => ({ ...movement, orderIndex: index }))

    const { data: remainingRows, error: remainingError } = await supabase
      .from('exercise_logs')
      .select('id, slot_id, order_index')
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })
    if (remainingError) throw new Error(remainingError.message)
    const rowsBySlotId = new Map(
      (remainingRows ?? [])
        .filter((row) => row.id !== data.exerciseLogId)
        .map((row) => [row.slot_id, row]),
    )
    const exerciseOrders = remainingMovements.map((movement) => {
      const row = rowsBySlotId.get(movement.slotId ?? movement.id)
      if (!row) throw new Error('Exercise order is stale. Refresh and try again.')
      return { exerciseLogId: row.id, orderIndex: movement.orderIndex }
    })
    const nextSnapshot: PlannedSession = { ...snapshot, movements: remainingMovements }
    const { error: mutationError } = await supabase.rpc('remove_ad_hoc_exercise_v2', {
      p_session_id: data.sessionId,
      p_request_id: data.requestId,
      p_expected_state_version: data.expectedStateVersion,
      p_intent: intent,
      p_exercise_log_id: data.exerciseLogId,
      p_next_snapshot: nextSnapshot as unknown as Json,
      p_exercise_orders: exerciseOrders as unknown as Json,
    })
    if (mutationError) throw new Error(mutationError.message)

    return getSessionInternal(data.sessionId)
  })
