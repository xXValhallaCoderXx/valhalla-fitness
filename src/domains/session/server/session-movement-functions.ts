import { createServerFn } from '@tanstack/react-start'
import type { MovementSwapOption } from '~/domains/movement'
import type { MovementSlot, PlannedSession } from '~/domains/session'
import { buildMovementSwapOptions } from '~/domains/movement/lib/movements'
import {
  getMovementCatalogForSwap,
  getReplacementRulesForSwap,
} from '~/domains/movement/server/movement-functions'
import {
  sessionExerciseInputSchema,
  substituteMovementInputSchema,
} from '~/domains/session/lib/schemas'
import type { SupabaseServerClient } from '~/shared/server/supabase'
import type { Tables } from '~/shared/types/database'
import { getSessionInternal } from '~/domains/session/server/session-read-functions'
import { phaseKeyForSnapshot } from '~/domains/session/server/session-server-helpers'
import { requireSessionUser } from '~/domains/session/server/session-server'

type SwapContext = {
  sessionRow: Tables<'workout_sessions'>
  exerciseRow: Tables<'exercise_logs'>
  snapshot: PlannedSession
  slotId: string
  phaseKey: string
  role: MovementSlot['role']
}

async function getSwapContext(supabase: SupabaseServerClient, userId: string, sessionId: string, exerciseLogId: string): Promise<SwapContext> {
  const { data: sessionRow, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()
  if (sessionError) throw new Error(sessionError.message)

  const { data: exerciseRow, error: exerciseError } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('id', exerciseLogId)
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single()
  if (exerciseError) throw new Error(exerciseError.message)

  const snapshot = sessionRow.prescription_snapshot as PlannedSession
  const slotId = exerciseRow.slot_id
  const movement = snapshot.movements.find((item) => (item.slotId ?? item.id) === slotId)

  return {
    sessionRow,
    exerciseRow,
    snapshot,
    slotId,
    phaseKey: phaseKeyForSnapshot(snapshot, movement),
    role: exerciseRow.role as MovementSlot['role'],
  }
}

async function getSwapOptionsForContext(supabase: SupabaseServerClient, context: SwapContext): Promise<MovementSwapOption[]> {
  if (context.role === 'main') return []
  const [catalog, rules] = await Promise.all([
    getMovementCatalogForSwap(supabase),
    getReplacementRulesForSwap(supabase),
  ])
  const options = buildMovementSwapOptions({
    movementId: context.exerciseRow.planned_movement_id,
    role: context.role,
    templateId: context.snapshot.templateId,
    phaseKey: context.phaseKey,
    slotId: context.slotId,
    catalog,
    rules,
  }).filter((option) => option.movementId !== context.exerciseRow.performed_movement_id)
  if (context.exerciseRow.performed_movement_id !== context.exerciseRow.planned_movement_id) {
    const plannedMovement = catalog[context.exerciseRow.planned_movement_id]
    if (plannedMovement) {
      options.unshift({
        movementId: plannedMovement.id,
        movementName: plannedMovement.name,
        category: plannedMovement.category,
        equipment: plannedMovement.equipment,
        relationshipLabel: 'Default for this slot',
        source: 'default',
        allowedScopes: ['session', 'phase_slot'],
      })
    }
  }
  return options
}

export const listMovementSwapOptionsFn = createServerFn({ method: 'GET' })
  .validator((data) => sessionExerciseInputSchema.parse(data))
  .handler(async ({ data }): Promise<MovementSwapOption[]> => {
    const { supabase, user } = await requireSessionUser()
    const context = await getSwapContext(supabase, user.id, data.sessionId, data.exerciseLogId)
    return getSwapOptionsForContext(supabase, context)
  })

export const substituteMovementFn = createServerFn({ method: 'POST' })
  .validator((data) => substituteMovementInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireSessionUser()
    const scope = data.scope ?? 'session'
    const intent = {
      exerciseLogId: data.exerciseLogId,
      performedMovementId: data.performedMovementId,
      reason: data.reason,
      note: data.note?.trim() || null,
      scope,
    }
    const { data: sessionState, error: sessionStateError } = await supabase
      .from('workout_sessions')
      .select('status, state_version')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionStateError) throw new Error(sessionStateError.message)
    if (
      sessionState.status !== 'in_progress' ||
      Number(sessionState.state_version) !== data.expectedStateVersion
    ) {
      const { error: replayError } = await supabase.rpc('substitute_session_movement_v2', {
        p_session_id: data.sessionId,
        p_request_id: data.requestId,
        p_expected_state_version: data.expectedStateVersion,
        p_intent: intent,
        p_exercise_log_id: data.exerciseLogId,
        p_performed_movement_id: data.performedMovementId,
        p_reason: data.reason,
        p_note: intent.note,
        p_scope: scope,
        p_phase_key: '',
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }
    const context = await getSwapContext(supabase, user.id, data.sessionId, data.exerciseLogId)

    if (context.role === 'main') {
      throw new Error('Main lifts cannot be swapped.')
    }
    if (scope === 'phase_slot' && context.sessionRow.program_instance_id === null) {
      throw new Error('Ad-hoc workouts only support session swaps.')
    }

    if (context.exerciseRow.performed_movement_id !== data.performedMovementId) {
      const options = await getSwapOptionsForContext(supabase, context)
      const selectedOption = options.find(
        (option) => option.movementId === data.performedMovementId && option.allowedScopes.includes(scope),
      )
      if (!selectedOption) {
        throw new Error('This movement is not an allowed replacement for the selected slot.')
      }
    }

    const { error: mutationError } = await supabase.rpc('substitute_session_movement_v2', {
      p_session_id: data.sessionId,
      p_request_id: data.requestId,
      p_expected_state_version: data.expectedStateVersion,
      p_intent: intent,
      p_exercise_log_id: data.exerciseLogId,
      p_performed_movement_id: data.performedMovementId,
      p_reason: data.reason,
      p_note: intent.note,
      p_scope: scope,
      p_phase_key: context.phaseKey,
    })
    if (mutationError) throw new Error(mutationError.message)

    return getSessionInternal(data.sessionId)
  })
