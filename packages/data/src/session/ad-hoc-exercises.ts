import type { z } from 'zod'
import {
  isActiveMovement,
  isFreeWeightMovement,
} from '@sheetless/domain/movement/movements'
import type { PlannedSession, WorkoutSession } from '@sheetless/domain/session/types'
import {
  AD_HOC_DEFAULT_SET_COUNT,
  buildAdHocMovementSlot,
  nextAdHocSlotId,
} from '@sheetless/domain/session/ad-hoc'
import {
  addAdHocExerciseInputSchema,
  removeAdHocExerciseInputSchema,
} from '@sheetless/domain/session/schemas'
import type { Json } from '@sheetless/domain/shared/types/database'
import { getMovementCatalogForSwap } from '../movement/catalog'
import type { UserContext } from '../shared/context'
import { getSession } from './reads'
import { getPreviousComparablesBySlotId } from './previous-comparables'

export async function addAdHocExercise(
  ctx: UserContext,
  input: z.infer<typeof addAdHocExerciseInputSchema>,
): Promise<WorkoutSession> {
    const data = addAdHocExerciseInputSchema.parse(input)
    const { supabase, user } = ctx
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
      return getSession(ctx, data.sessionId)
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
    if (!movement || !isActiveMovement(movement)) throw new Error('Movement is not available.')

    const snapshot = sessionRow.prescription_snapshot as PlannedSession
    if (
      snapshot.equipmentMode === 'free_weight' &&
      !isFreeWeightMovement(movement)
    ) {
      throw new Error('Free weights only workouts require a free-weight exercise.')
    }
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

    return getSession(ctx, data.sessionId)
}

export async function removeAdHocExercise(
  ctx: UserContext,
  input: z.infer<typeof removeAdHocExerciseInputSchema>,
): Promise<WorkoutSession> {
    const data = removeAdHocExerciseInputSchema.parse(input)
    const { supabase, user } = ctx
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
      return getSession(ctx, data.sessionId)
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
      return getSession(ctx, data.sessionId)
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

    return getSession(ctx, data.sessionId)
}
