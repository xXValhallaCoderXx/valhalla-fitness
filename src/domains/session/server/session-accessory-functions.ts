import { createServerFn } from '@tanstack/react-start'
import type { Movement, SwapScope } from '~/domains/movement'
import type { AccessoryProgressionMethod } from '~/domains/program'
import type { MovementSlot, PlannedSession, SetTarget, WorkoutSession } from '~/domains/session'
import {
  accessoryProgressionRuleId,
  accessoryTargetSummary,
  buildAccessoryInitialSets,
  isAccessoryProgressionMethod,
  parseAccessoryRepTarget,
  removeAddedAccessory,
  reorderAddedAccessories,
} from '~/domains/session/lib/accessories'
import {
  addSessionAccessoryInputSchema,
  removeSessionAccessoryInputSchema,
  reorderSessionAccessoriesInputSchema,
} from '~/domains/session/lib/schemas'
import { getMovementCatalogForSwap } from '~/domains/movement/server/movement-functions'
import type { Json, Tables } from '~/shared/types/database'
import { getSessionInternal } from '~/domains/session/server/session-read-functions'
import { getPreviousComparablesBySlotId } from '~/domains/session/server/previous-comparables'
import { phaseKeyForSnapshot } from '~/domains/session/server/session-server-helpers'
import { requireSessionUser } from '~/domains/session/server/session-server'

function templateSessionIdForSnapshot(snapshot: PlannedSession, sessionRow: Pick<Tables<'workout_sessions'>, 'planned_session_id'>) {
  if (snapshot.templateSessionId) return snapshot.templateSessionId
  const plannedSessionId = String(sessionRow.planned_session_id ?? snapshot.id)
  return plannedSessionId.replace(/-w\d+$/i, '')
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
  .validator((data) => addSessionAccessoryInputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkoutSession> => {
    if (!isAccessoryProgressionMethod(data.progressionMethod)) throw new Error('Invalid accessory progression method.')
    const repTarget = parseAccessoryRepTarget(data.repTarget)
    if (!repTarget) throw new Error('Enter a valid rep target, such as 8-12 or 15.')
    if (data.scope !== 'session' && data.scope !== 'phase_slot') throw new Error('Invalid accessory scope.')
    const note = data.note?.trim() || null
    const intent = {
      movementId: data.movementId,
      progressionMethod: data.progressionMethod,
      repTarget: data.repTarget,
      scope: data.scope,
      note,
    }

    const { supabase, user } = await requireSessionUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    if (
      sessionRow.status !== 'in_progress' ||
      Number(sessionRow.state_version) !== data.expectedStateVersion
    ) {
      const { error: replayError } = await supabase.rpc('add_session_accessory_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.clientMutationId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_exercise: null,
        p_sets: null,
        p_next_snapshot: null,
        p_future_addition: null,
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
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
    if (!movement || movement.isCompetition) throw new Error('Invalid accessory movement.')

    const snapshot = sessionRow.prescription_snapshot as PlannedSession
    const phaseKey = phaseKeyForSnapshot(snapshot)
    const templateSessionId = templateSessionIdForSnapshot(snapshot, sessionRow)
    const { data: persistedAdditionRows, error: persistedAdditionError } = sessionRow.program_instance_id
      ? await supabase
          .from('program_accessory_additions')
          .select('slot_id')
          .eq('user_id', user.id)
          .eq('program_instance_id', sessionRow.program_instance_id)
          .eq('session_id', templateSessionId)
      : { data: [], error: null }
    if (persistedAdditionError) throw new Error(persistedAdditionError.message)

    const usedSlotIds = new Set((exerciseRows ?? []).map((row) => row.slot_id))
    for (const snapshotSlot of snapshot.movements) usedSlotIds.add(snapshotSlot.slotId ?? snapshotSlot.id)
    // A current-session removal can leave the future programme addition intact.
    // Reserve those hidden slots so a later add cannot collide with them.
    for (const row of persistedAdditionRows ?? []) {
      usedSlotIds.add(`slot-${templateSessionId}-${row.slot_id}`)
    }
    const { additionSlotId, sessionSlotId } = nextAccessorySlotIds(templateSessionId, usedSlotIds, movement.id)
    const maxOrderIndex = Math.max(
      0,
      ...(exerciseRows ?? []).map((row) => Number(row.order_index) || 0),
      ...snapshot.movements.map((item) => Number(item.orderIndex) || 0),
    )
    const orderIndex = maxOrderIndex + 1
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
    const previousBySlotId = await getPreviousComparablesBySlotId(
      supabase,
      user.id,
      {
        ...snapshot,
        movements: [snapshotMovement],
      },
    )
    snapshotMovement.previous = previousBySlotId[sessionSlotId] ?? null

    const nextSnapshot: PlannedSession = {
      ...snapshot,
      templateSessionId,
      movements: [...snapshot.movements, snapshotMovement],
    }
    const futureAddition = data.scope === 'phase_slot'
      ? {
          templateSessionId,
          slotId: additionSlotId,
          phaseKey,
          movementId: movement.id,
          prescriptionId: `manual-${data.progressionMethod}`,
          targetSummary,
          sets: targetSets,
          note,
          progressionMethod: data.progressionMethod,
          effectiveFromWeekIndex: Number(snapshot.weekIndex) + 1,
        }
      : null
    const { error: mutationError } = await supabase.rpc('add_session_accessory_v2', {
      p_session_id: data.sessionId,
      p_request_id: data.clientMutationId,
      p_expected_state_version: data.expectedStateVersion,
      p_intent: intent as unknown as Json,
      p_exercise: {
        slotId: sessionSlotId,
        plannedMovementId: movement.id,
        performedMovementId: movement.id,
        role: 'accessory',
        orderIndex,
        targetSummary,
        note,
      },
      p_sets: targetSets as unknown as Json,
      p_next_snapshot: nextSnapshot as unknown as Json,
      p_future_addition: futureAddition as unknown as Json,
    })
    if (mutationError) throw new Error(mutationError.message)

    return getSessionInternal(data.sessionId)
  })

type ProgramAccessoryAdditionOrderRow = Pick<
  Tables<'program_accessory_additions'>,
  'id' | 'session_id' | 'slot_id' | 'phase_key' | 'order_index'
>

function matchingProgramAccessoryAddition(
  rows: ProgramAccessoryAdditionOrderRow[],
  movement: MovementSlot,
  snapshot: PlannedSession,
) {
  const slotId = movement.slotId ?? movement.id
  const phaseKey = phaseKeyForSnapshot(snapshot, movement)
  const matches = rows.filter(
    (row) =>
      `slot-${row.session_id}-${row.slot_id}` === slotId &&
      (row.phase_key === '*' || row.phase_key === phaseKey),
  )
  if (matches.length !== 1) {
    throw new Error('Future accessory settings are stale. Refresh and try again.')
  }
  return matches[0]!
}

export const reorderSessionAccessoriesFn = createServerFn({ method: 'POST' })
  .validator((data) => reorderSessionAccessoriesInputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkoutSession> => {
    if (!Array.isArray(data.orderedSlotIds) || data.orderedSlotIds.some((slotId) => typeof slotId !== 'string')) {
      throw new Error('Invalid accessory order.')
    }

    const { supabase, user } = await requireSessionUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    const intent = { orderedSlotIds: data.orderedSlotIds }
    if (
      sessionRow.status !== 'in_progress' ||
      Number(sessionRow.state_version) !== data.expectedStateVersion
    ) {
      const { error: replayError } = await supabase.rpc('reorder_session_accessories_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.requestId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_next_snapshot: null,
        p_exercise_orders: null,
        p_future_addition_ids: [],
        p_future_order_indexes: [],
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }
    const programInstanceId = sessionRow.program_instance_id
    if (!programInstanceId) throw new Error('Only program sessions can reorder added accessories.')

    const snapshot = sessionRow.prescription_snapshot as PlannedSession
    const movements = reorderAddedAccessories(snapshot.movements, data.orderedSlotIds)
    const addedMovements = movements.filter((movement) => movement.isAdded)
    const { data: exerciseRows, error: exerciseError } = await supabase
      .from('exercise_logs')
      .select('id, slot_id, order_index')
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
    if (exerciseError) throw new Error(exerciseError.message)

    const exerciseRowsBySlotId = new Map((exerciseRows ?? []).map((row) => [row.slot_id, row]))
    for (const movement of addedMovements) {
      const slotId = movement.slotId ?? movement.id
      if (!exerciseRowsBySlotId.has(slotId)) {
        throw new Error('Accessory order is stale. Refresh and try again.')
      }
    }

    const templateSessionId = templateSessionIdForSnapshot(snapshot, sessionRow)
    const phaseMovements = addedMovements.filter((movement) => movement.addedScope === 'phase_slot')
    const { data: additionRows, error: additionError } = phaseMovements.length
      ? await supabase
          .from('program_accessory_additions')
          .select('id, session_id, slot_id, phase_key, order_index')
          .eq('user_id', user.id)
          .eq('program_instance_id', programInstanceId)
          .eq('session_id', templateSessionId)
      : { data: [], error: null }
    if (additionError) throw new Error(additionError.message)

    const matchedAdditionRows = phaseMovements.map((movement) =>
      matchingProgramAccessoryAddition(additionRows ?? [], movement, snapshot),
    )
    if (new Set(matchedAdditionRows.map((row) => row.id)).size !== matchedAdditionRows.length) {
      throw new Error('Future accessory settings are stale. Refresh and try again.')
    }
    // Unmatched rows can be future additions removed from only this session. Reuse the visible
    // rows' occupied positions so those hidden rows keep their order and are never overwritten.
    const futureOrderIndexes = matchedAdditionRows
      .map((row) => Number(row.order_index))
      .sort((left, right) => left - right)

    const nextSnapshot: PlannedSession = {
      ...snapshot,
      templateSessionId,
      movements,
    }
    const exerciseOrders = addedMovements.map((movement) => {
      const slotId = movement.slotId ?? movement.id
      const exerciseRow = exerciseRowsBySlotId.get(slotId)!
      return { exerciseLogId: exerciseRow.id, orderIndex: movement.orderIndex }
    })
    const { error: mutationError } = await supabase.rpc('reorder_session_accessories_v2', {
      p_session_id: data.sessionId,
      p_request_id: data.requestId,
      p_expected_state_version: data.expectedStateVersion,
      p_intent: intent,
      p_next_snapshot: nextSnapshot as unknown as Json,
      p_exercise_orders: exerciseOrders as unknown as Json,
      p_future_addition_ids: matchedAdditionRows.map((row) => row.id),
      p_future_order_indexes: futureOrderIndexes,
    })
    if (mutationError) throw new Error(mutationError.message)

    return getSessionInternal(data.sessionId)
  })

export const removeSessionAccessoryFn = createServerFn({ method: 'POST' })
  .validator((data) => removeSessionAccessoryInputSchema.parse(data))
  .handler(async ({ data }): Promise<WorkoutSession> => {
    if (data.scope !== 'session' && data.scope !== 'phase_slot') throw new Error('Invalid accessory scope.')

    const { supabase, user } = await requireSessionUser()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    const intent = {
      exerciseLogId: data.exerciseLogId,
      scope: data.scope,
    }
    if (
      sessionRow.status !== 'in_progress' ||
      Number(sessionRow.state_version) !== data.expectedStateVersion
    ) {
      const { error: replayError } = await supabase.rpc('remove_session_accessory_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.requestId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_exercise_log_id: data.exerciseLogId,
        p_next_snapshot: null,
        p_exercise_orders: null,
        p_future_addition_id: null,
        p_future_remaining_ids: [],
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }
    const programInstanceId = sessionRow.program_instance_id
    if (!programInstanceId) throw new Error('Only program sessions can remove added accessories.')

    const { data: exerciseRow, error: exerciseError } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('id', data.exerciseLogId)
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (exerciseError) throw new Error(exerciseError.message)

    const snapshot = sessionRow.prescription_snapshot as PlannedSession
    if (!exerciseRow) {
      const { error: replayError } = await supabase.rpc('remove_session_accessory_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.requestId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_exercise_log_id: data.exerciseLogId,
        p_next_snapshot: snapshot as unknown as Json,
        p_exercise_orders: [],
        p_future_addition_id: null,
        p_future_remaining_ids: [],
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }
    const movement = snapshot.movements.find((item) => (item.slotId ?? item.id) === exerciseRow.slot_id)
    if (!movement) throw new Error('Accessory is no longer part of this session.')
    if (!movement.isAdded) throw new Error('Only added accessories can be removed.')
    if (data.scope === 'phase_slot' && movement.addedScope !== 'phase_slot') {
      throw new Error('This accessory was only added to the current session.')
    }

    const templateSessionId = templateSessionIdForSnapshot(snapshot, sessionRow)
    let futureAddition: ProgramAccessoryAdditionOrderRow | null = null
    let remainingAdditions: ProgramAccessoryAdditionOrderRow[] = []
    if (data.scope === 'phase_slot') {
      const { data: additionRows, error: additionError } = await supabase
        .from('program_accessory_additions')
        .select('id, session_id, slot_id, phase_key, order_index')
        .eq('user_id', user.id)
        .eq('program_instance_id', programInstanceId)
        .eq('session_id', templateSessionId)
      if (additionError) throw new Error(additionError.message)
      futureAddition = matchingProgramAccessoryAddition(additionRows ?? [], movement, snapshot)
      remainingAdditions = (additionRows ?? [])
        .filter((row) => row.id !== futureAddition?.id)
        .sort((left, right) => Number(left.order_index) - Number(right.order_index) || left.id.localeCompare(right.id))
    }

    const nextMovements = removeAddedAccessory(snapshot.movements, exerciseRow.slot_id)
    const nextSnapshot: PlannedSession = {
      ...snapshot,
      templateSessionId,
      movements: nextMovements,
    }
    const remainingAddedMovements = nextMovements.filter((item) => item.isAdded)
    const { data: remainingExerciseRows, error: remainingExerciseError } = remainingAddedMovements.length
      ? await supabase
          .from('exercise_logs')
          .select('id, slot_id, order_index')
          .eq('session_id', data.sessionId)
          .eq('user_id', user.id)
      : { data: [], error: null }
    if (remainingExerciseError) throw new Error(remainingExerciseError.message)
    const rowsBySlotId = new Map((remainingExerciseRows ?? []).map((row) => [row.slot_id, row]))
    const exerciseOrders = remainingAddedMovements.map((remainingMovement) => {
      const slotId = remainingMovement.slotId ?? remainingMovement.id
      const remainingRow = rowsBySlotId.get(slotId)
      if (!remainingRow) throw new Error('Accessory order is stale. Refresh and try again.')
      return {
        exerciseLogId: remainingRow.id,
        orderIndex: remainingMovement.orderIndex,
      }
    })
    const { error: mutationError } = await supabase.rpc('remove_session_accessory_v2', {
      p_session_id: data.sessionId,
      p_request_id: data.requestId,
      p_expected_state_version: data.expectedStateVersion,
      p_intent: intent,
      p_exercise_log_id: data.exerciseLogId,
      p_next_snapshot: nextSnapshot as unknown as Json,
      p_exercise_orders: exerciseOrders as unknown as Json,
      p_future_addition_id: futureAddition?.id ?? null,
      p_future_remaining_ids: remainingAdditions.map((row) => row.id),
    })
    if (mutationError) throw new Error(mutationError.message)

    return getSessionInternal(data.sessionId)
  })
