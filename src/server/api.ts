import { createServerFn } from '@tanstack/react-start'
import type {
  AnchorInput,
  PlannedSession,
  ProgramInstance,
  ProgramTemplateSummary,
  ProgressionDecision,
  SessionSummary,
  SetLog,
  TodayPayload,
  Unit,
  WorkoutSession,
} from '~/types/training'
import { defaultAnchors, expandPlannedSession, templateCatalog } from '~/lib/templates'
import {
  evaluate531TmBand,
  evaluateAccessoryDoubleProgression,
  evaluateBullmastiffPlusSet,
} from '~/lib/progression'
import { getMovementName } from '~/lib/movements'
import { getSupabaseServerClient, hasSupabaseEnv } from './supabase'

async function requireUser() {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Not authenticated')
  }
  return { supabase, user: data.user }
}

async function ensureProfile() {
  const { supabase, user } = await requireUser()
  const email = user.email ?? null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (profile) return profile
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, email, units: 'kg', rounding: 2.5 })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

function mapTemplateRow(row: any): ProgramTemplateSummary {
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    sourceLabel: row.source === 'bromley_base_strength' ? 'Bromley' : 'Healthy 5/3/1',
    description: row.description,
    daysPerWeek: row.days_per_week,
    progressionLabel: row.progression_label,
    complexity: row.complexity,
    tags: row.tags ?? [],
    available: row.id === 'healthy-531-fsl' || row.id === 'bromley-bullmastiff',
  }
}

function templateVersionIdFromRows(rows: any[]) {
  const version = rows[0]
  if (!version?.id) throw new Error('Template version missing')
  return version.id as string
}

async function getActiveProgramInternal(): Promise<ProgramInstance | null> {
  const { supabase, user } = await requireUser()
  const { data: instance, error } = await supabase
    .from('program_instances')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!instance) return null

  const { data: anchors, error: anchorError } = await supabase
    .from('program_anchors')
    .select('*')
    .eq('program_instance_id', instance.id)
    .order('movement_id')
  if (anchorError) throw new Error(anchorError.message)

  return {
    id: instance.id,
    templateId: instance.template_id,
    templateVersionId: instance.template_version_id,
    title: instance.title,
    status: instance.status,
    startDate: instance.start_date,
    units: instance.units,
    rounding: Number(instance.rounding),
    currentWeekIndex: instance.current_week_index,
    anchors: (anchors ?? []).map((anchor: any) => ({
      movementId: anchor.movement_id,
      anchorType: anchor.anchor_type,
      value: Number(anchor.value),
    })),
  }
}

async function getPendingDecisionsInternal(programInstanceId?: string) {
  const { supabase, user } = await requireUser()
  let query = supabase
    .from('progression_decisions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (programInstanceId) query = query.eq('program_instance_id', programInstanceId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row: any): ProgressionDecision => ({
    id: row.id,
    movementId: row.movement_id,
    movementName: getMovementName(row.movement_id),
    ruleId: row.rule_id,
    scope: row.scope,
    status: row.status,
    inputSummary: row.input_summary,
    recommendation: row.recommendation,
    previousAnchor: row.previous_anchor === null ? null : Number(row.previous_anchor),
    recommendedAnchor: row.recommended_anchor === null ? null : Number(row.recommended_anchor),
  }))
}

async function getTodayInternal(): Promise<TodayPayload> {
  const activeProgram = await getActiveProgramInternal()
  if (!activeProgram) {
    return {
      activeProgram: null,
      plannedSession: null,
      activeSession: null,
      pendingDecisions: [],
    }
  }

  const { supabase, user } = await requireUser()
  const { data: activeSessionRow, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('program_instance_id', activeProgram.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)

  const plannedSession = expandPlannedSession(activeProgram, new Date().toISOString().slice(0, 10))
  const activeSession = activeSessionRow ? await getSessionInternal(activeSessionRow.id) : null
  const pendingDecisions = await getPendingDecisionsInternal(activeProgram.id)

  return {
    activeProgram,
    plannedSession,
    activeSession,
    pendingDecisions,
  }
}

async function getSessionInternal(sessionId: string): Promise<WorkoutSession> {
  const { supabase, user } = await requireUser()
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

  const exerciseIds = (exerciseRows ?? []).map((row: any) => row.id)
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
  return {
    ...snapshot,
    sessionId: sessionRow.id,
    status: sessionRow.status,
    startedAt: sessionRow.started_at,
    completedAt: sessionRow.completed_at,
    notes: sessionRow.notes,
    syncState: 'synced',
    movements: snapshot.movements.map((movement) => {
      const exercise = (exerciseRows ?? []).find((row: any) => row.slot_id === movement.id)
      const sets = (setRows ?? [])
        .filter((set: any) => set.exercise_log_id === exercise?.id)
        .map((set: any): SetLog => ({
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
        id: exercise?.id ?? movement.id,
        performedMovementId: exercise?.performed_movement_id ?? movement.movementId,
        performedMovementName: getMovementName(exercise?.performed_movement_id ?? movement.movementId),
        notes: exercise?.notes,
        sets: sets.length ? sets : movement.sets,
      }
    }),
  }
}

export const getMeFn = createServerFn({ method: 'GET' }).handler(async () => {
  if (!hasSupabaseEnv()) return null
  let profile
  try {
    profile = await ensureProfile()
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') return null
    throw error
  }
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    units: profile.units as Unit,
    rounding: Number(profile.rounding),
    autoStartTimer: profile.auto_start_timer,
    equipmentProfile: profile.equipment_profile ?? [],
  }
})

export const updateSettingsFn = createServerFn({ method: 'POST' })
  .validator((data: { units: Unit; rounding: number; autoStartTimer: boolean; equipmentProfile: string[] }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const { error } = await supabase
      .from('profiles')
      .update({
        units: data.units,
        rounding: data.rounding,
        auto_start_timer: data.autoStartTimer,
        equipment_profile: data.equipmentProfile,
      })
      .eq('id', user.id)
    if (error) throw new Error(error.message)
    return getMeFn()
  })

export const listTemplatesFn = createServerFn({ method: 'GET' }).handler(async () => {
  if (!hasSupabaseEnv()) return templateCatalog
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('program_templates')
    .select('*')
    .order('name', { ascending: true })
  if (error || !data?.length) return templateCatalog
  const seeded = data.map(mapTemplateRow)
  const missing = templateCatalog.filter((template) => !seeded.some((row) => row.id === template.id))
  return [...seeded, ...missing]
})

export const startProgramFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      templateId: string
      title?: string
      units: Unit
      rounding: number
      anchors: AnchorInput[]
      replaceActiveProgram?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    const profile = await ensureProfile()
    const { supabase, user } = await requireUser()
    const template = templateCatalog.find((item) => item.id === data.templateId)
    if (!template?.available) throw new Error('Template is not available yet')

    const { data: versions, error: versionError } = await supabase
      .from('program_template_versions')
      .select('id')
      .eq('template_id', data.templateId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (versionError) throw new Error(versionError.message)

    const { data: activePrograms, error: activeProgramError } = await supabase
      .from('program_instances')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
    if (activeProgramError) throw new Error(activeProgramError.message)

    const { data: activeSessions, error: activeSessionError } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
    if (activeSessionError) throw new Error(activeSessionError.message)

    const activeProgramIds = (activePrograms ?? []).map((program: any) => program.id as string)
    const activeSessionIds = (activeSessions ?? []).map((session: any) => session.id as string)
    if ((activeProgramIds.length || activeSessionIds.length) && !data.replaceActiveProgram) {
      throw new Error('Active program in progress')
    }

    if (activeSessionIds.length) {
      const { error: abandonError } = await supabase
        .from('workout_sessions')
        .update({ status: 'skipped' })
        .eq('user_id', user.id)
        .in('id', activeSessionIds)
      if (abandonError) throw new Error(abandonError.message)
    }

    await supabase
      .from('program_instances')
      .update({ status: 'archived' })
      .eq('user_id', user.id)
      .eq('status', 'active')

    const { data: instance, error } = await supabase
      .from('program_instances')
      .insert({
        user_id: user.id,
        template_id: data.templateId,
        template_version_id: templateVersionIdFromRows(versions ?? []),
        title: data.title || template.name,
        units: data.units ?? profile.units,
        rounding: data.rounding ?? Number(profile.rounding),
        current_block_id: data.templateId === 'healthy-531-fsl' ? 'cycle' : 'base',
        current_week_index: 0,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    const anchors = data.anchors.length ? data.anchors : defaultAnchors(data.units)
    const { error: anchorError } = await supabase.from('program_anchors').insert(
      anchors.map((anchor) => ({
        user_id: user.id,
        program_instance_id: instance.id,
        movement_id: anchor.movementId,
        anchor_type: anchor.anchorType,
        value: anchor.value,
        source: { kind: 'setup' },
      })),
    )
    if (anchorError) throw new Error(anchorError.message)
    return getActiveProgramInternal()
  })

export const getActiveProgramFn = createServerFn({ method: 'GET' }).handler(getActiveProgramInternal)

export const getTodayFn = createServerFn({ method: 'GET' }).handler(getTodayInternal)

export const startSessionFn = createServerFn({ method: 'POST' })
  .validator((data: { clientMutationId: string }) => data)
  .handler(async ({ data }) => {
    const today = await getTodayInternal()
    if (!today.activeProgram || !today.plannedSession) throw new Error('No planned session')
    if (today.activeSession) return today.activeSession
    const { supabase, user } = await requireUser()
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        program_instance_id: today.activeProgram.id,
        planned_session_id: today.plannedSession.id,
        status: 'in_progress',
        scheduled_date: today.plannedSession.scheduledDate,
        started_at: new Date().toISOString(),
        prescription_snapshot: today.plannedSession,
        client_mutation_id: data.clientMutationId,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    for (const movement of today.plannedSession.movements) {
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: user.id,
          session_id: session.id,
          slot_id: movement.id,
          planned_movement_id: movement.movementId,
          performed_movement_id: movement.performedMovementId ?? movement.movementId,
          role: movement.role,
          order_index: movement.orderIndex,
          target_summary: movement.targetSummary,
        })
        .select('*')
        .single()
      if (exerciseError) throw new Error(exerciseError.message)
      const { error: setError } = await supabase.from('set_logs').insert(
        movement.sets.map((set) => ({
          user_id: user.id,
          exercise_log_id: exercise.id,
          set_index: set.setIndex,
          target_load: set.targetLoad,
          target_reps: set.targetReps,
          target_rep_min: set.targetRepMin,
          target_rep_max: set.targetRepMax,
          target_rpe: set.targetRpe,
          target_rir: set.targetRir,
          actual_load: set.actualLoad,
          actual_reps: set.actualReps,
          is_top_set: Boolean(set.isTopSet),
          is_amrap: Boolean(set.isAmrap),
          is_backoff: Boolean(set.isBackoff),
        })),
      )
      if (setError) throw new Error(setError.message)
    }

    return getSessionInternal(session.id)
  })

export const getSessionFn = createServerFn({ method: 'GET' })
  .validator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => getSessionInternal(data.sessionId))

export const upsertSetLogFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      sessionId: string
      exerciseLogId: string
      setIndex: number
      actualLoad?: number | null
      actualReps?: number | null
      actualRir?: number | null
      actualRpe?: number | null
      completed?: boolean
      note?: string | null
      clientMutationId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const { error } = await supabase
      .from('set_logs')
      .update({
        actual_load: data.actualLoad,
        actual_reps: data.actualReps,
        actual_rir: data.actualRir,
        actual_rpe: data.actualRpe,
        completed: data.completed ?? false,
        note: data.note,
        client_mutation_id: data.clientMutationId,
      })
      .eq('user_id', user.id)
      .eq('exercise_log_id', data.exerciseLogId)
      .eq('set_index', data.setIndex)
    if (error) throw new Error(error.message)
    return getSessionInternal(data.sessionId)
  })

export const substituteMovementFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      sessionId: string
      exerciseLogId: string
      slotId: string
      plannedMovementId: string
      performedMovementId: string
      reason: 'equipment_missing' | 'crowded_gym' | 'preference' | 'fatigue' | 'other'
      note?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const { error } = await supabase
      .from('exercise_logs')
      .update({ performed_movement_id: data.performedMovementId })
      .eq('id', data.exerciseLogId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    const { error: logError } = await supabase.from('substitution_logs').insert({
      user_id: user.id,
      session_id: data.sessionId,
      slot_id: data.slotId,
      planned_movement_id: data.plannedMovementId,
      performed_movement_id: data.performedMovementId,
      reason: data.reason,
      note: data.note,
    })
    if (logError) throw new Error(logError.message)
    return getSessionInternal(data.sessionId)
  })

function buildDecisions(session: WorkoutSession, activeProgram: ProgramInstance) {
  const decisions: ProgressionDecision[] = []
  for (const movement of session.movements) {
    if (movement.role === 'main') {
      const topSet = movement.sets.find((set) => set.isTopSet || set.isAmrap)
      const anchor = activeProgram.anchors.find((item) => item.movementId === movement.movementId)
      if (topSet && anchor && session.templateId === 'bromley-bullmastiff') {
        decisions.push(
          evaluateBullmastiffPlusSet(topSet, topSet.targetReps ?? 1, anchor.value, activeProgram.rounding, movement.movementId),
        )
      }
      if (topSet && anchor && session.templateId === 'healthy-531-fsl') {
        decisions.push(evaluate531TmBand([topSet], anchor.value, activeProgram.rounding, movement.movementId))
      }
    }
    if (movement.role === 'accessory') {
      const outcome = evaluateAccessoryDoubleProgression(
        movement.sets,
        movement.sets[0]?.targetRepMin ?? 8,
        movement.sets[0]?.targetRepMax ?? 12,
        movement.sets[0]?.targetRir ?? 2,
      )
      if (outcome === 'Add load next time') {
        decisions.push({
          id: `pending-accessory-${movement.movementId}`,
          movementId: movement.movementId,
          movementName: movement.movementName,
          ruleId: 'accessory_double_progression',
          scope: 'session',
          status: 'pending',
          inputSummary: `${movement.movementName} completed the top of the rep range.`,
          recommendation: outcome,
        })
      }
    }
  }
  return decisions
}

export const finishSessionFn = createServerFn({ method: 'POST' })
  .validator((data: { sessionId: string; notes?: string | null }) => data)
  .handler(async ({ data }): Promise<SessionSummary> => {
    const activeProgram = await getActiveProgramInternal()
    if (!activeProgram) throw new Error('No active program')
    const session = await getSessionInternal(data.sessionId)
    const { supabase, user } = await requireUser()
    const decisions = buildDecisions(session, activeProgram)

    await supabase
      .from('workout_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: data.notes,
      })
      .eq('id', data.sessionId)
      .eq('user_id', user.id)

    for (const decision of decisions) {
      await supabase.from('progression_decisions').insert({
        user_id: user.id,
        program_instance_id: activeProgram.id,
        movement_id: decision.movementId,
        rule_id: decision.ruleId,
        scope: decision.scope,
        status: 'pending',
        input_summary: decision.inputSummary,
        recommendation: decision.recommendation,
        previous_anchor: decision.previousAnchor,
        recommended_anchor: decision.recommendedAnchor,
      })
    }

    const completedSession = await getSessionInternal(data.sessionId)
    const sets = completedSession.movements.flatMap((movement) => movement.sets)
    return {
      session: completedSession,
      completedSets: sets.filter((set) => set.completed).length,
      totalSets: sets.length,
      topSets: sets.filter((set) => set.isTopSet || set.isAmrap),
      accessoryOutcomes: completedSession.movements
        .filter((movement) => movement.role === 'accessory')
        .map((movement) => `${movement.movementName}: ${evaluateAccessoryDoubleProgression(movement.sets, movement.sets[0]?.targetRepMin ?? 8, movement.sets[0]?.targetRepMax ?? 12, movement.sets[0]?.targetRir ?? 2)}`),
      decisions,
    }
  })

export const resolveProgressionDecisionFn = createServerFn({ method: 'POST' })
  .validator((data: { decisionId: string; action: 'accepted' | 'dismissed' | 'pending' }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const { data: decision, error } = await supabase
      .from('progression_decisions')
      .select('*')
      .eq('id', data.decisionId)
      .eq('user_id', user.id)
      .single()
    if (error) throw new Error(error.message)
    if (data.action === 'pending') return decision

    const { error: updateError } = await supabase
      .from('progression_decisions')
      .update({ status: data.action, resolved_at: new Date().toISOString() })
      .eq('id', data.decisionId)
      .eq('user_id', user.id)
    if (updateError) throw new Error(updateError.message)

    if (data.action === 'accepted' && decision.recommended_anchor !== null) {
      await supabase
        .from('program_anchors')
        .update({ value: decision.recommended_anchor })
        .eq('user_id', user.id)
        .eq('program_instance_id', decision.program_instance_id)
        .eq('movement_id', decision.movement_id)
    }
    return getPendingDecisionsInternal(decision.program_instance_id)
  })

export const getRecentHistoryFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, planned_session_id, status, completed_at, scheduled_date, prescription_snapshot')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.prescription_snapshot?.title ?? row.planned_session_id,
    completedAt: row.completed_at,
    scheduledDate: row.scheduled_date,
    programTitle: row.prescription_snapshot?.programTitle,
  }))
})

export const getMovementHistoryFn = createServerFn({ method: 'GET' })
  .validator((data: { movementId: string }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const { data: exercises, error } = await supabase
      .from('exercise_logs')
      .select('id, session_id, planned_movement_id, performed_movement_id, role, target_summary')
      .eq('user_id', user.id)
      .or(`planned_movement_id.eq.${data.movementId},performed_movement_id.eq.${data.movementId}`)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw new Error(error.message)
    return exercises ?? []
  })
