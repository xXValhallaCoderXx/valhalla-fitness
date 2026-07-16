import type { Credentials } from './auth'
import { signInClient } from './profile'

export async function getProgramDiscardState(credentials: Credentials) {
  const { client, userId } = await signInClient(credentials)
  const { data: program, error: programError } = await client
    .from('program_instances')
    .select('id, current_block_id, current_week_index, customization_status, customization_summary')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  if (programError) throw new Error(`Unable to read ${credentials.email} programme: ${programError.message}`)

  const [{ data: overrides, error: overridesError }, { data: additions, error: additionsError }] = await Promise.all([
    client
      .from('program_movement_overrides')
      .select('slot_id, phase_key, role, original_movement_id, replacement_movement_id, effective_from_week_index, source_session_id, source_exercise_log_id')
      .eq('user_id', userId)
      .eq('program_instance_id', program.id),
    client
      .from('program_accessory_additions')
      .select('session_id, slot_id, phase_key, movement_id, prescription_id, source_slot_id, target_summary, sets, note, progression_method, effective_from_week_index, order_index')
      .eq('user_id', userId)
      .eq('program_instance_id', program.id),
  ])
  if (overridesError) throw new Error(`Unable to read ${credentials.email} overrides: ${overridesError.message}`)
  if (additionsError) throw new Error(`Unable to read ${credentials.email} additions: ${additionsError.message}`)

  return {
    program,
    overrides: sortStable(overrides ?? []),
    additions: sortStable(additions ?? []),
  }
}

export async function getSessionDiscardState(credentials: Credentials, sessionId: string) {
  const { client, userId } = await signInClient(credentials)
  const { data: session, error: sessionError } = await client
    .from('workout_sessions')
    .select('program_instance_id, planned_session_id, status, scheduled_date, prescription_snapshot, notes')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (sessionError) throw new Error(`Unable to read session ${sessionId}: ${sessionError.message}`)
  if (!session) return null

  const { data: exercises, error: exercisesError } = await client
    .from('exercise_logs')
    .select('id, slot_id, planned_movement_id, performed_movement_id, role, order_index, target_summary, notes')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('order_index')
  if (exercisesError) throw new Error(`Unable to read exercises for ${sessionId}: ${exercisesError.message}`)

  const exerciseIds = (exercises ?? []).map((exercise) => exercise.id)
  const sets = exerciseIds.length
    ? await client
        .from('set_logs')
        .select('exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, target_rpe, actual_load, actual_reps, actual_rir, actual_rpe, completed, is_top_set, is_amrap, is_backoff, note')
        .eq('user_id', userId)
        .in('exercise_log_id', exerciseIds)
    : { data: [], error: null }
  if (sets.error) throw new Error(`Unable to read sets for ${sessionId}: ${sets.error.message}`)

  const slotByExerciseId = new Map((exercises ?? []).map((exercise) => [exercise.id, exercise.slot_id]))
  return {
    exerciseIds,
    state: {
      session,
      exercises: (exercises ?? []).map((exercise) => ({
        slot_id: exercise.slot_id,
        planned_movement_id: exercise.planned_movement_id,
        performed_movement_id: exercise.performed_movement_id,
        role: exercise.role,
        order_index: exercise.order_index,
        target_summary: exercise.target_summary,
        notes: exercise.notes,
      })),
      sets: sortStable((sets.data ?? []).map((set) => ({
        ...set,
        slot_id: slotByExerciseId.get(set.exercise_log_id),
        exercise_log_id: undefined,
      }))),
    },
  }
}

export async function getDiscardResidue(
  credentials: Credentials,
  sessionId: string,
  exerciseIds: string[],
) {
  const { client, userId } = await signInClient(credentials)
  const [sessions, exercises, sets, substitutions, feedback, journal] = await Promise.all([
    countRows(client.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('id', sessionId)),
    countRows(client.from('exercise_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('session_id', sessionId)),
    exerciseIds.length
      ? countRows(client.from('set_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('exercise_log_id', exerciseIds))
      : Promise.resolve(0),
    countRows(client.from('substitution_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('session_id', sessionId)),
    countRows(client.from('feedback_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('session_id', sessionId)),
    countRows(client.from('session_program_change_journal').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('session_id', sessionId)),
  ])
  return { sessions, exercises, sets, substitutions, feedback, journal }
}

export async function addDiscardFeedback(credentials: Credentials, sessionId: string) {
  const { client, userId } = await signInClient(credentials)
  const { error } = await client.from('feedback_events').insert({
    user_id: userId,
    source: 'menu',
    category: 'general',
    message: 'Discard regression residue marker.',
    session_id: sessionId,
  })
  if (error) throw new Error(`Unable to seed discard feedback for ${sessionId}: ${error.message}`)
}

export async function countSessionsWithTitle(credentials: Credentials, title: string) {
  const { client, userId } = await signInClient(credentials)
  const { data, error } = await client
    .from('workout_sessions')
    .select('prescription_snapshot')
    .eq('user_id', userId)
  if (error) throw new Error(`Unable to read ${credentials.email} sessions: ${error.message}`)
  return (data ?? []).filter((row) => {
    const snapshot = row.prescription_snapshot
    return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) && snapshot.title === title
  }).length
}

async function countRows(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

function sortStable<T>(rows: T[]): T[] {
  return [...rows].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
}
