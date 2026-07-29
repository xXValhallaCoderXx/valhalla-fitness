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
  movement: MovementSlot
  slotId: string
  phaseKey: string
  role: MovementSlot['role']
  hasCompletedSets: boolean
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
  if (!movement) throw new Error('Workout movement snapshot is stale. Refresh and try again.')

  const { count: completedSetCount, error: completedSetError } = await supabase
    .from('set_logs')
    .select('id', { count: 'exact', head: true })
    .eq('exercise_log_id', exerciseLogId)
    .eq('user_id', userId)
    .eq('completed', true)
  if (completedSetError) throw new Error(completedSetError.message)

  return {
    sessionRow,
    exerciseRow,
    snapshot,
    movement,
    slotId,
    phaseKey: phaseKeyForSnapshot(snapshot, movement),
    role: exerciseRow.role as MovementSlot['role'],
    hasCompletedSets: (completedSetCount ?? 0) > 0,
  }
}

async function getSwapOptionsForContext(
  supabase: SupabaseServerClient,
  context: SwapContext,
  providedCatalog?: Awaited<ReturnType<typeof getMovementCatalogForSwap>>,
): Promise<MovementSwapOption[]> {
  if (context.role === 'main' || context.hasCompletedSets) return []
  const [catalog, rules] = await Promise.all([
    providedCatalog ?? getMovementCatalogForSwap(supabase),
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
        p_previous: null,
      })
      if (replayError) throw new Error(replayError.message)
      return getSessionInternal(data.sessionId)
    }
    const context = await getSwapContext(supabase, user.id, data.sessionId, data.exerciseLogId)

    if (context.role === 'main') {
      throw new Error('Main lifts cannot be swapped.')
    }
    if (context.hasCompletedSets) {
      throw new Error('A movement cannot be swapped after one of its sets has been logged.')
    }
    if (scope === 'phase_slot' && context.sessionRow.program_instance_id === null) {
      throw new Error('Ad-hoc workouts only support session swaps.')
    }

    const catalog = await getMovementCatalogForSwap(supabase)
    const replacementMovement = catalog[data.performedMovementId]
    if (!replacementMovement) throw new Error('Unknown replacement movement.')
    if (context.exerciseRow.performed_movement_id === data.performedMovementId) {
      throw new Error('This movement is already selected.')
    }

    const options = await getSwapOptionsForContext(supabase, context, catalog)
    const selectedOption = options.find(
      (option) => option.movementId === data.performedMovementId && option.allowedScopes.includes(scope),
    )
    if (!selectedOption) {
      throw new Error('This movement is not an allowed replacement for the selected slot.')
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
      // The database derives the comparable from completed history. Keeping
      // caller-generated history out of this mutation prevents direct RPC
      // clients from persisting fabricated prior results.
      p_previous: null,
    })
    if (mutationError) throw new Error(mutationError.message)

    return getSessionInternal(data.sessionId)
  })
