import { createServerFn } from '@tanstack/react-start'
import type {
  AnchorInput,
  Movement,
  HistoryDashboard,
  MovementHistoryEntry,
  MovementReplacementRule,
  MovementSlot,
  MovementSwapOption,
  PlannedSession,
  ProgramInstance,
  ProgramMovementOverride,
  ProgramOverview,
  ProgramRecentSessionSummary,
  ProgramTemplateSummary,
  RecentHistoryEntry,
  ProgressionDecision,
  SessionSummary,
  SetLog,
  SubstitutionReason,
  SwapScope,
  TodayPayload,
  ThemePreference,
  Unit,
  UserProfile,
  WorkoutSession,
} from '~/types/training'
import { defaultAnchors, expandPlannedSession, programForNextUncompletedSession, templateCatalog } from '~/lib/templates'
import {
  parseTemplateDefinition,
  validateRequiredAnchors,
  validateTemplateDefinition,
  type TemplateDefinition,
} from '~/lib/template-engine'
import {
  e1rm,
  evaluate531TmBand,
  evaluateAccessoryDoubleProgression,
  evaluateBullmastiffPlusSet,
  mround,
} from '~/lib/progression'
import { buildMovementSwapOptions, defaultMovementReplacementRules, getMovementName, movementCatalog } from '~/lib/movements'
import {
  buildHistoryDashboard,
  type HistorySessionInput,
  type HistorySubstitutionInput,
} from '~/lib/history'
import { buildProgramOverview } from '~/lib/program-overview'
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
    .insert({ id: user.id, email, units: 'kg', rounding: 2.5, theme_preference: 'system' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

function mapTemplateRow(row: any, available = true): ProgramTemplateSummary {
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
    available,
  }
}

function templateVersionIdFromRows(rows: any[]) {
  const version = rows[0]
  if (!version?.id) throw new Error('Template version missing')
  return version.id as string
}

function templateDefinitionFromRows(rows: any[]) {
  const version = rows[0]
  if (!version?.definition) throw new Error('Template definition missing')
  return parseTemplateDefinition(version.definition)
}

async function getPinnedTemplateDefinition(
  supabase: any,
  templateVersionId: string,
  templateId: string,
): Promise<TemplateDefinition> {
  const { data, error } = await supabase
    .from('program_template_versions')
    .select('id, template_id, definition')
    .eq('id', templateVersionId)
    .eq('template_id', templateId)
    .single()
  if (error) throw new Error(error.message)
  return parseTemplateDefinition(data.definition)
}

async function getLatestTemplateVersion(
  supabase: any,
  templateId: string,
): Promise<{ id: string; definition: TemplateDefinition }> {
  const { data, error } = await supabase
    .from('program_template_versions')
    .select('id, definition')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  return {
    id: templateVersionIdFromRows(data ?? []),
    definition: templateDefinitionFromRows(data ?? []),
  }
}

function mapProgramMovementOverride(row: any): ProgramMovementOverride {
  return {
    id: row.id,
    programInstanceId: row.program_instance_id,
    slotId: row.slot_id,
    phaseKey: row.phase_key,
    role: row.role,
    originalMovementId: row.original_movement_id,
    replacementMovementId: row.replacement_movement_id,
    effectiveFromWeekIndex: row.effective_from_week_index,
  }
}

function mapMovementReplacementRule(row: any): MovementReplacementRule {
  return {
    id: row.id,
    sourceMovementId: row.source_movement_id,
    replacementMovementId: row.replacement_movement_id,
    role: row.role,
    templateId: row.template_id,
    phaseKey: row.phase_key,
    slotId: row.slot_id,
    relationshipLabel: row.relationship_label,
    allowSessionScope: row.allow_session_scope,
    allowPhaseSlotScope: row.allow_phase_slot_scope,
  }
}

function mapMovementRow(row: any): Movement {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    equipment: row.equipment ?? [],
    variationOf: row.variation_of,
    defaultUnit: row.default_unit,
    isCompetition: row.is_competition,
  }
}

async function getMovementCatalogForSwap(supabase: any): Promise<Record<string, Movement>> {
  const { data, error } = await supabase.from('movements').select('*')
  if (error) throw new Error(error.message)
  const catalog = Object.fromEntries((data ?? []).map((row: any) => [row.id, mapMovementRow(row)]))
  return Object.keys(catalog).length ? catalog : movementCatalog
}

async function getReplacementRulesForSwap(supabase: any): Promise<MovementReplacementRule[]> {
  const { data, error } = await supabase
    .from('movement_replacement_rules')
    .select('*')
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  const rules = (data ?? []).map(mapMovementReplacementRule)
  return rules.length ? rules : defaultMovementReplacementRules
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

  const { data: movementOverrides, error: overrideError } = await supabase
    .from('program_movement_overrides')
    .select('*')
    .eq('user_id', user.id)
    .eq('program_instance_id', instance.id)
    .order('created_at', { ascending: true })
  if (overrideError) throw new Error(overrideError.message)

  const templateDefinition = await getPinnedTemplateDefinition(
    supabase,
    instance.template_version_id,
    instance.template_id,
  )

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
    movementOverrides: (movementOverrides ?? []).map(mapProgramMovementOverride),
    templateDefinition,
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
  return (data ?? []).map(mapProgressionDecision)
}

function mapProgressionDecision(row: any): ProgressionDecision {
  return {
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
  }
}

async function updateProgramCurrentWeekIndex(supabase: any, userId: string, program: ProgramInstance) {
  const { error } = await supabase
    .from('program_instances')
    .update({ current_week_index: program.currentWeekIndex })
    .eq('id', program.id)
    .eq('user_id', userId)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
}

async function getTodayInternal(): Promise<TodayPayload> {
  let activeProgram = await getActiveProgramInternal()
  if (!activeProgram) {
    return {
      activeProgram: null,
      plannedSession: null,
      activeSession: null,
      completedSession: null,
      pendingDecisions: [],
    }
  }

  const { supabase, user } = await requireUser()
  const templateDefinition = activeProgram.templateDefinition
  if (!templateDefinition) throw new Error('Active program template definition missing')
  const scheduledDate = new Date().toISOString().slice(0, 10)
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

  const { data: completedSessionRows, error: completedSessionError } = await supabase
    .from('workout_sessions')
    .select('id, planned_session_id')
    .eq('user_id', user.id)
    .eq('program_instance_id', activeProgram.id)
    .eq('status', 'completed')
    .eq('scheduled_date', scheduledDate)
    .order('completed_at', { ascending: false })
  if (completedSessionError) throw new Error(completedSessionError.message)

  const activeSession = activeSessionRow ? await getSessionInternal(activeSessionRow.id) : null
  const completedSessionRow = completedSessionRows?.[0]
  const completedSession = completedSessionRow ? await getSessionInternal(completedSessionRow.id) : null
  if (!activeSession) {
    const nextProgram = programForNextUncompletedSession(
      activeProgram,
      (completedSessionRows ?? []).map((row: any) => row.planned_session_id),
      scheduledDate,
      templateDefinition,
    )
    if (nextProgram.currentWeekIndex !== activeProgram.currentWeekIndex) {
      await updateProgramCurrentWeekIndex(supabase, user.id, nextProgram)
      activeProgram = nextProgram
    }
  }

  const barePlannedSession = expandPlannedSession(activeProgram, scheduledDate, templateDefinition)
  const plannedSession = expandPlannedSession(
    activeProgram,
    scheduledDate,
    templateDefinition,
    await getPreviousComparablesBySlotId(supabase, user.id, barePlannedSession),
  )
  const pendingDecisions = await getPendingDecisionsInternal(activeProgram.id)

  return {
    activeProgram,
    plannedSession,
    activeSession,
    completedSession,
    pendingDecisions,
  }
}

type ComparableCandidate = {
  slotId: string
  plannedMovementId: string
  performedMovementId: string
  role: MovementSlot['role']
  completedAt?: string | null
  scheduledDate: string
  templateId?: string | null
  sets: SetLog[]
}

type ComparableSessionRow = {
  id: string
  completed_at?: string | null
  scheduled_date: string
  prescription_snapshot?: PlannedSession | null
}

async function getPreviousComparablesBySlotId(
  supabase: any,
  userId: string,
  plannedSession: PlannedSession,
): Promise<Record<string, MovementSlot['previous']>> {
  const movementIds = new Set(
    plannedSession.movements.flatMap((movement) => [
      movement.movementId,
      movement.performedMovementId ?? movement.movementId,
    ]),
  )
  if (!movementIds.size) return {}

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from('exercise_logs')
    .select('id, session_id, slot_id, planned_movement_id, performed_movement_id, role, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(400)
  if (exerciseError) throw new Error(exerciseError.message)

  const relevantExerciseRows = (exerciseRows ?? []).filter(
    (exercise: any) =>
      movementIds.has(exercise.planned_movement_id) ||
      movementIds.has(exercise.performed_movement_id),
  )
  const exerciseIds = relevantExerciseRows.map((exercise: any) => exercise.id as string)
  const sessionIds = Array.from(new Set(relevantExerciseRows.map((exercise: any) => exercise.session_id as string)))
  if (!exerciseIds.length || !sessionIds.length) return {}

  const { data: sessionRows, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('id, status, completed_at, scheduled_date, prescription_snapshot')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .in('id', sessionIds)
  if (sessionError) throw new Error(sessionError.message)

  const completedSessionsById = new Map<string, ComparableSessionRow>(
    (sessionRows ?? []).map((session: any) => [session.id, session as ComparableSessionRow]),
  )
  const completedExerciseRows = relevantExerciseRows.filter((exercise: any) => completedSessionsById.has(exercise.session_id))
  if (!completedExerciseRows.length) return {}

  const { data: setRows, error: setError } = await supabase
    .from('set_logs')
    .select('id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, target_rpe, actual_load, actual_reps, actual_rir, actual_rpe, completed, is_top_set, is_amrap, is_backoff')
    .eq('user_id', userId)
    .in('exercise_log_id', completedExerciseRows.map((exercise: any) => exercise.id))
    .order('set_index', { ascending: true })
  if (setError) throw new Error(setError.message)

  const setsByExerciseId = new Map<string, SetLog[]>()
  for (const row of setRows ?? []) {
    const sets = setsByExerciseId.get(row.exercise_log_id) ?? []
    sets.push({
      id: row.id,
      exerciseLogId: row.exercise_log_id,
      setIndex: row.set_index,
      targetLoad: row.target_load === null ? null : Number(row.target_load),
      targetReps: row.target_reps,
      targetRepMin: row.target_rep_min,
      targetRepMax: row.target_rep_max,
      targetRir: row.target_rir === null ? null : Number(row.target_rir),
      targetRpe: row.target_rpe === null ? null : Number(row.target_rpe),
      actualLoad: row.actual_load === null ? null : Number(row.actual_load),
      actualReps: row.actual_reps,
      actualRir: row.actual_rir === null ? null : Number(row.actual_rir),
      actualRpe: row.actual_rpe === null ? null : Number(row.actual_rpe),
      completed: row.completed,
      isTopSet: row.is_top_set,
      isAmrap: row.is_amrap,
      isBackoff: row.is_backoff,
    })
    setsByExerciseId.set(row.exercise_log_id, sets)
  }

  const candidates: ComparableCandidate[] = completedExerciseRows.map((exercise: any): ComparableCandidate => {
    const session = completedSessionsById.get(exercise.session_id)
    const snapshot = session?.prescription_snapshot as PlannedSession | null
    return {
      slotId: exercise.slot_id,
      plannedMovementId: exercise.planned_movement_id,
      performedMovementId: exercise.performed_movement_id,
      role: exercise.role,
      completedAt: session?.completed_at,
      scheduledDate: session?.scheduled_date ?? plannedSession.scheduledDate,
      templateId: snapshot?.templateId ?? null,
      sets: setsByExerciseId.get(exercise.id) ?? [],
    }
  })

  const result: Record<string, MovementSlot['previous']> = {}
  for (const movement of plannedSession.movements) {
    const slotId = movement.slotId ?? movement.id
    const ranked: Array<{ candidate: ComparableCandidate; score: number }> = candidates
      .map((candidate) => ({
        candidate,
        score: scoreComparableCandidate(plannedSession, movement, candidate),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        return comparableDate(right.candidate).localeCompare(comparableDate(left.candidate))
      })
    const best = ranked[0]?.candidate
    const comparable = best ? comparableFromCandidate(movement, best, plannedSession.units) : null
    if (comparable) result[slotId] = comparable
  }
  return result
}

function scoreComparableCandidate(
  plannedSession: PlannedSession,
  movement: MovementSlot,
  candidate: ComparableCandidate,
) {
  let score = 0
  const performedMovementId = movement.performedMovementId ?? movement.movementId
  if (candidate.performedMovementId === performedMovementId) score += 100
  if (candidate.plannedMovementId === movement.movementId) score += 80
  if (candidate.role === movement.role) score += 20
  if (candidate.templateId === plannedSession.templateId) score += 8
  if (candidate.slotId === (movement.slotId ?? movement.id)) score += 12
  return score
}

function comparableFromCandidate(
  movement: MovementSlot,
  candidate: ComparableCandidate,
  units: Unit,
): MovementSlot['previous'] {
  const completedSets = candidate.sets.filter((set) => set.completed && hasNumber(set.actualReps))
  if (!completedSets.length) return null
  const set = movement.role === 'main' ? bestMainComparableSet(completedSets) : bestAccessoryComparableSet(completedSets)
  if (!set) return null

  const load = set.actualLoad ?? set.targetLoad ?? null
  const reps = set.actualReps ?? set.targetReps ?? null
  const estimatedMax = hasNumber(load) && hasNumber(reps) ? mround(e1rm(load, reps, set.actualRir ?? 0), 0.5) : null
  const label =
    movement.role === 'main'
      ? `Last comparable: ${formatComparableSet(set, units)}${estimatedMax ? ` · e1RM ${formatNumber(estimatedMax)} ${units}` : ''} · ${formatComparableDate(comparableDate(candidate))}`
      : `Last time: ${formatComparableSet(set, units)} · ${formatComparableDate(comparableDate(candidate))}`

  return {
    movementId: candidate.performedMovementId,
    label,
    load,
    reps,
    rir: set.actualRir ?? null,
    performedAt: candidate.completedAt ?? candidate.scheduledDate,
    e1rm: estimatedMax,
    setType: set.isAmrap ? 'amrap' : set.isTopSet ? 'top_set' : set.isBackoff ? 'backoff' : movement.role === 'accessory' ? 'accessory' : 'best_set',
  }
}

function bestMainComparableSet(sets: SetLog[]) {
  const topSets = sets.filter((set) => set.isTopSet || set.isAmrap)
  const pool = topSets.length ? topSets : sets
  return [...pool].sort((left, right) => setScore(right) - setScore(left))[0] ?? null
}

function bestAccessoryComparableSet(sets: SetLog[]) {
  return [...sets].sort((left, right) => setScore(right) - setScore(left))[0] ?? null
}

function setScore(set: SetLog) {
  const load = set.actualLoad ?? set.targetLoad ?? 0
  const reps = set.actualReps ?? set.targetReps ?? 0
  return load > 0 ? e1rm(load, reps, set.actualRir ?? 0) : reps
}

function comparableDate(candidate: ComparableCandidate) {
  return candidate.completedAt ?? candidate.scheduledDate
}

function formatComparableSet(set: SetLog, units: Unit) {
  const load = set.actualLoad ?? set.targetLoad
  const reps = set.actualReps ?? set.targetReps
  const rir = typeof set.actualRir === 'number' ? ` @ RIR ${set.actualRir}` : ''
  const loadText = typeof load === 'number' ? `${formatNumber(load)} ${units}` : 'bodyweight'
  return `${loadText} x ${reps ?? '-'}${set.isAmrap ? '+' : ''}${rir}`
}

function formatComparableDate(value: string) {
  return value.slice(0, 10)
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
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
      const slotId = movement.slotId ?? movement.id
      const exercise = (exerciseRows ?? []).find((row: any) => row.slot_id === slotId)
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
        slotId,
        id: exercise?.id ?? movement.id,
        performedMovementId: exercise?.performed_movement_id ?? movement.movementId,
        performedMovementName: getMovementName(exercise?.performed_movement_id ?? movement.movementId),
        notes: exercise?.notes,
        sets: sets.length ? sets : movement.sets,
      }
    }),
  }
}

export const getMeFn = createServerFn({ method: 'GET' }).handler(async (): Promise<UserProfile | null> => {
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
    equipmentProfile: profile.equipment_profile ?? [],
    themePreference: (profile.theme_preference ?? 'system') as ThemePreference,
  }
})

export const updateSettingsFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      units: Unit
      rounding: number
      equipmentProfile: string[]
      themePreference: ThemePreference
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const { error } = await supabase
      .from('profiles')
      .update({
        units: data.units,
        rounding: data.rounding,
        equipment_profile: data.equipmentProfile,
        theme_preference: data.themePreference,
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

  const { data: versions, error: versionError } = await supabase
    .from('program_template_versions')
    .select('template_id, definition, created_at')
    .order('created_at', { ascending: false })
  if (versionError) throw new Error(versionError.message)

  const latestByTemplateId = new Map<string, any>()
  for (const version of versions ?? []) {
    if (!latestByTemplateId.has(version.template_id)) latestByTemplateId.set(version.template_id, version)
  }

  const seeded = data.map((row: any) => {
    const validation = validateTemplateDefinition(latestByTemplateId.get(row.id)?.definition)
    return mapTemplateRow(row, validation.ok)
  })
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
    const { data: templateRow, error: templateError } = await supabase
      .from('program_templates')
      .select('*')
      .eq('id', data.templateId)
      .eq('is_active', true)
      .single()
    if (templateError) throw new Error(templateError.message)

    const template = mapTemplateRow(templateRow)
    const templateVersion = await getLatestTemplateVersion(supabase, data.templateId)
    const anchors = data.anchors.length ? data.anchors : defaultAnchors(data.units)
    validateRequiredAnchors(templateVersion.definition, anchors)

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
        template_version_id: templateVersion.id,
        title: data.title || template.name,
        units: data.units ?? profile.units,
        rounding: data.rounding ?? Number(profile.rounding),
        current_block_id: templateVersion.definition.weeks[0]?.phaseKey ?? null,
        current_week_index: 0,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

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
          slot_id: movement.slotId ?? movement.id,
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
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('status')
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .single()
    if (sessionError) throw new Error(sessionError.message)
    if (sessionRow.status === 'completed') {
      throw new Error('This session is already finished. Completed sessions cannot be edited.')
    }
    if (sessionRow.status !== 'in_progress') {
      throw new Error('Only in-progress sessions can be edited.')
    }

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
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return getSessionInternal(data.sessionId)
  })

type SwapContext = {
  sessionRow: any
  exerciseRow: any
  snapshot: PlannedSession
  slotId: string
  phaseKey: string
  role: MovementSlot['role']
}

function phaseKeyForSnapshot(snapshot: PlannedSession, movement?: MovementSlot | null) {
  if (movement?.phaseKey) return movement.phaseKey
  if (snapshot.templateId === 'bromley-bullmastiff') {
    return snapshot.weekLabel.toLowerCase().startsWith('peak') ? 'peak' : 'base'
  }
  return 'cycle'
}

async function getSwapContext(supabase: any, userId: string, sessionId: string, exerciseLogId: string): Promise<SwapContext> {
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
  const slotId = exerciseRow.slot_id as string
  const movement = snapshot.movements.find((item) => (item.slotId ?? item.id) === slotId)

  return {
    sessionRow,
    exerciseRow,
    snapshot,
    slotId,
    phaseKey: phaseKeyForSnapshot(snapshot, movement),
    role: exerciseRow.role,
  }
}

async function getSwapOptionsForContext(supabase: any, context: SwapContext): Promise<MovementSwapOption[]> {
  if (context.role === 'main') return []
  const [catalog, rules] = await Promise.all([
    getMovementCatalogForSwap(supabase),
    getReplacementRulesForSwap(supabase),
  ])
  return buildMovementSwapOptions({
    movementId: context.exerciseRow.planned_movement_id,
    role: context.role,
    templateId: context.snapshot.templateId,
    phaseKey: context.phaseKey,
    slotId: context.slotId,
    catalog,
    rules,
  }).filter((option) => option.movementId !== context.exerciseRow.performed_movement_id)
}

export const listMovementSwapOptionsFn = createServerFn({ method: 'GET' })
  .validator((data: { sessionId: string; exerciseLogId: string }) => data)
  .handler(async ({ data }): Promise<MovementSwapOption[]> => {
    const { supabase, user } = await requireUser()
    const context = await getSwapContext(supabase, user.id, data.sessionId, data.exerciseLogId)
    return getSwapOptionsForContext(supabase, context)
  })

export const substituteMovementFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      sessionId: string
      exerciseLogId: string
      performedMovementId: string
      reason: SubstitutionReason
      note?: string
      scope?: SwapScope
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const scope = data.scope ?? 'session'
    const context = await getSwapContext(supabase, user.id, data.sessionId, data.exerciseLogId)

    if (context.sessionRow.status === 'completed') {
      throw new Error('This session is already finished. Completed sessions cannot be edited.')
    }
    if (context.sessionRow.status !== 'in_progress') {
      throw new Error('Only in-progress sessions can be edited.')
    }
    if (context.role === 'main') {
      throw new Error('Main lifts cannot be swapped.')
    }

    const options = await getSwapOptionsForContext(supabase, context)
    const selectedOption = options.find(
      (option) => option.movementId === data.performedMovementId && option.allowedScopes.includes(scope),
    )
    if (!selectedOption) {
      throw new Error('This movement is not an allowed replacement for the selected slot.')
    }

    const { error } = await supabase
      .from('exercise_logs')
      .update({ performed_movement_id: data.performedMovementId })
      .eq('id', data.exerciseLogId)
      .eq('session_id', data.sessionId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)

    const { error: logError } = await supabase.from('substitution_logs').insert({
      user_id: user.id,
      session_id: data.sessionId,
      slot_id: context.slotId,
      planned_movement_id: context.exerciseRow.planned_movement_id,
      performed_movement_id: data.performedMovementId,
      reason: data.reason,
      note: data.note,
    })
    if (logError) throw new Error(logError.message)

    if (scope === 'phase_slot') {
      const { data: programRow, error: programError } = await supabase
        .from('program_instances')
        .select('id, current_week_index')
        .eq('id', context.sessionRow.program_instance_id)
        .eq('user_id', user.id)
        .single()
      if (programError) throw new Error(programError.message)

      const { error: overrideError } = await supabase
        .from('program_movement_overrides')
        .upsert(
          {
            user_id: user.id,
            program_instance_id: programRow.id,
            slot_id: context.slotId,
            phase_key: context.phaseKey,
            role: context.role,
            original_movement_id: context.exerciseRow.planned_movement_id,
            replacement_movement_id: data.performedMovementId,
            effective_from_week_index: Number(programRow.current_week_index) + 1,
            source_session_id: data.sessionId,
            source_exercise_log_id: data.exerciseLogId,
          },
          { onConflict: 'program_instance_id,slot_id,phase_key,role' },
        )
      if (overrideError) throw new Error(overrideError.message)
    }

    return getSessionInternal(data.sessionId)
  })

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasCompletedReps(set: SetLog) {
  return set.completed && hasNumber(set.actualReps)
}

function hasCompletedRepsAndRir(set: SetLog) {
  return hasCompletedReps(set) && hasNumber(set.actualRir)
}

function hasCompleteAccessoryInputs(movement: MovementSlot) {
  return movement.sets.length > 0 && movement.sets.every(hasCompletedRepsAndRir)
}

function accessoryOutcome(movement: MovementSlot) {
  if (!hasCompleteAccessoryInputs(movement)) return 'Incomplete data - no recommendation'
  return evaluateAccessoryDoubleProgression(
    movement.sets,
    movement.sets[0]?.targetRepMin ?? 8,
    movement.sets[0]?.targetRepMax ?? 12,
    movement.sets[0]?.targetRir ?? 2,
  )
}

function buildDecisions(session: WorkoutSession, activeProgram: ProgramInstance) {
  const decisions: ProgressionDecision[] = []
  for (const movement of session.movements) {
    if (movement.role === 'main') {
      const anchor = activeProgram.anchors.find((item) => item.movementId === movement.movementId)
      const topSetWithReps = movement.sets.find((set) => (set.isTopSet || set.isAmrap) && hasCompletedReps(set))
      const topSetWithRir = movement.sets.find((set) => (set.isTopSet || set.isAmrap) && hasCompletedRepsAndRir(set))
      if (topSetWithReps && anchor && session.templateId === 'bromley-bullmastiff') {
        decisions.push(
          evaluateBullmastiffPlusSet(topSetWithReps, topSetWithReps.targetReps ?? 1, anchor.value, activeProgram.rounding, movement.movementId),
        )
      }
      if (topSetWithRir && anchor && session.templateId === 'healthy-531-fsl') {
        decisions.push(evaluate531TmBand([topSetWithRir], anchor.value, activeProgram.rounding, movement.movementId))
      }
    }
    if (movement.role === 'accessory' && hasCompleteAccessoryInputs(movement)) {
      const outcome = accessoryOutcome(movement)
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
    if (session.status === 'completed') throw new Error('Session is already finished')
    if (session.status !== 'in_progress') throw new Error('Only in-progress sessions can be finished')
    const { supabase, user } = await requireUser()
    const decisions = buildDecisions(session, activeProgram)

    const { error: finishError } = await supabase
      .from('workout_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: data.notes,
      })
      .eq('id', data.sessionId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .select('id')
      .single()
    if (finishError) throw new Error(finishError.message)

    await updateProgramCurrentWeekIndex(supabase, user.id, {
      ...activeProgram,
      currentWeekIndex: activeProgram.currentWeekIndex + 1,
    })

    for (const decision of decisions) {
      const { error: decisionError } = await supabase.from('progression_decisions').insert({
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
      if (decisionError) throw new Error(decisionError.message)
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
        .map((movement) => `${movement.movementName}: ${accessoryOutcome(movement)}`),
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
      const { error: anchorError } = await supabase
        .from('program_anchors')
        .update({ value: decision.recommended_anchor })
        .eq('user_id', user.id)
        .eq('program_instance_id', decision.program_instance_id)
        .eq('movement_id', decision.movement_id)
        .select('id')
        .single()
      if (anchorError) throw new Error(anchorError.message)
    }
    return getPendingDecisionsInternal(decision.program_instance_id)
  })

async function getHistoryInputs(
  supabase: any,
  userId: string,
  options: {
    programInstanceId?: string
    limit?: number
  } = {},
): Promise<{ sessions: HistorySessionInput[]; substitutions: HistorySubstitutionInput[] }> {
  let sessionQuery = supabase
    .from('workout_sessions')
    .select('id, program_instance_id, planned_session_id, status, completed_at, scheduled_date, prescription_snapshot')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
  if (options.programInstanceId) sessionQuery = sessionQuery.eq('program_instance_id', options.programInstanceId)
  if (options.limit) sessionQuery = sessionQuery.limit(options.limit)

  const { data: sessionRows, error } = await sessionQuery
  if (error) throw new Error(error.message)
  const rows = sessionRows ?? []
  const sessionIds = rows.map((row: any) => row.id as string)
  if (!sessionIds.length) return { sessions: [], substitutions: [] }

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from('exercise_logs')
    .select('id, session_id, planned_movement_id, performed_movement_id, role, target_summary, order_index')
    .eq('user_id', userId)
    .in('session_id', sessionIds)
    .order('order_index', { ascending: true })
  if (exerciseError) throw new Error(exerciseError.message)

  const exerciseIds = (exerciseRows ?? []).map((exercise: any) => exercise.id as string)
  const { data: setRows, error: setError } = exerciseIds.length
    ? await supabase
        .from('set_logs')
        .select('id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, actual_load, actual_reps, actual_rir, completed, is_top_set, is_amrap, is_backoff')
        .eq('user_id', userId)
        .in('exercise_log_id', exerciseIds)
        .order('set_index', { ascending: true })
    : { data: [], error: null }
  if (setError) throw new Error(setError.message)

  const { data: substitutionRows, error: substitutionError } = await supabase
    .from('substitution_logs')
    .select('id, session_id, planned_movement_id, performed_movement_id, reason, note, created_at')
    .eq('user_id', userId)
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })
  if (substitutionError) throw new Error(substitutionError.message)

  const setsByExerciseId = new Map<string, any[]>()
  for (const set of setRows ?? []) {
    const sets = setsByExerciseId.get(set.exercise_log_id) ?? []
    sets.push(set)
    setsByExerciseId.set(set.exercise_log_id, sets)
  }

  const exercisesBySessionId = new Map<string, any[]>()
  for (const exercise of exerciseRows ?? []) {
    const exercises = exercisesBySessionId.get(exercise.session_id) ?? []
    exercises.push(exercise)
    exercisesBySessionId.set(exercise.session_id, exercises)
  }

  const sessions = rows.map((row: any): HistorySessionInput => {
    const snapshot = row.prescription_snapshot as PlannedSession | null
    const exercises = exercisesBySessionId.get(row.id) ?? []
    const plannedSetCount = snapshot?.movements.reduce((total, movement) => total + movement.sets.length, 0) ?? 0
    return {
      id: row.id,
      plannedSessionId: row.planned_session_id,
      title: snapshot?.title ?? row.planned_session_id,
      programTitle: snapshot?.programTitle ?? null,
      templateId: snapshot?.templateId ?? null,
      programInstanceId: row.program_instance_id,
      scheduledDate: row.scheduled_date,
      completedAt: row.completed_at,
      units: snapshot?.units ?? null,
      weekLabel: snapshot?.weekLabel ?? null,
      hardness: snapshot?.hardness ?? null,
      estimatedMinutes: snapshot?.estimatedMinutes ?? null,
      movementCount: snapshot?.movements.length ?? exercises.length,
      plannedSetCount: plannedSetCount || exercises.reduce((total, exercise) => total + (setsByExerciseId.get(exercise.id)?.length ?? 0), 0),
      exercises: exercises.map((exercise: any) => ({
        id: exercise.id,
        plannedMovementId: exercise.planned_movement_id,
        performedMovementId: exercise.performed_movement_id,
        performedMovementName: getMovementName(exercise.performed_movement_id),
        role: exercise.role,
        targetSummary: exercise.target_summary,
        sets: (setsByExerciseId.get(exercise.id) ?? []).map((set: any) => ({
          id: set.id,
          setIndex: set.set_index,
          targetLoad: set.target_load === null ? null : Number(set.target_load),
          targetReps: set.target_reps,
          targetRepMin: set.target_rep_min,
          targetRepMax: set.target_rep_max,
          targetRir: set.target_rir === null ? null : Number(set.target_rir),
          actualLoad: set.actual_load === null ? null : Number(set.actual_load),
          actualReps: set.actual_reps,
          actualRir: set.actual_rir === null ? null : Number(set.actual_rir),
          completed: set.completed,
          isTopSet: set.is_top_set,
          isAmrap: set.is_amrap,
          isBackoff: set.is_backoff,
        })),
      })),
    }
  })

  const substitutions = (substitutionRows ?? []).map((row: any): HistorySubstitutionInput => ({
    id: row.id,
    sessionId: row.session_id,
    plannedMovementId: row.planned_movement_id,
    performedMovementId: row.performed_movement_id,
    reason: row.reason,
    note: row.note,
    createdAt: row.created_at,
  }))

  return { sessions, substitutions }
}

function buildProgramRecentSessions(sessions: HistorySessionInput[], units: Unit): ProgramRecentSessionSummary[] {
  return sessions.slice(0, 5).map((session): ProgramRecentSessionSummary => {
    const sets = session.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ exercise, set })))
    const completedSetCount = sets.filter(({ set }) => set.completed).length
    const topSetHighlights = sets
      .filter(({ set }) => set.completed && (set.isTopSet || set.isAmrap))
      .map(({ exercise, set }) => {
        const load = typeof set.actualLoad === 'number' ? `${formatNumber(set.actualLoad)} ${session.units ?? units}` : 'bodyweight'
        return `${exercise.performedMovementName} ${load} x ${set.actualReps ?? '-'}${set.isAmrap ? '+' : ''}`
      })
      .slice(0, 3)
    return {
      id: session.id,
      title: session.title,
      completedAt: session.completedAt,
      scheduledDate: session.scheduledDate,
      weekLabel: session.weekLabel,
      completedSetCount,
      plannedSetCount: session.plannedSetCount,
      topSetHighlights,
    }
  })
}

async function getAcceptedDecisionsInternal(supabase: any, userId: string, programInstanceId: string): Promise<ProgressionDecision[]> {
  const { data, error } = await supabase
    .from('progression_decisions')
    .select('*')
    .eq('user_id', userId)
    .eq('program_instance_id', programInstanceId)
    .eq('status', 'accepted')
    .order('resolved_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const seen = new Set<string>()
  const decisions: ProgressionDecision[] = []
  for (const row of data ?? []) {
    if (seen.has(row.movement_id)) continue
    seen.add(row.movement_id)
    decisions.push(mapProgressionDecision(row))
  }
  return decisions
}

export const getHistoryDashboardFn = createServerFn({ method: 'GET' }).handler(async (): Promise<HistoryDashboard> => {
  const { supabase, user } = await requireUser()
  const history = await getHistoryInputs(supabase, user.id, { limit: 240 })
  return buildHistoryDashboard(history)
})

export const getProgramOverviewFn = createServerFn({ method: 'GET' }).handler(async (): Promise<ProgramOverview> => {
  const today = await getTodayInternal()
  const { supabase, user } = await requireUser()
  const history = await getHistoryInputs(supabase, user.id, { limit: 240 })
  const bodyLoad = buildHistoryDashboard(history).bodyLoad
  const programHistory = today.activeProgram
    ? await getHistoryInputs(supabase, user.id, { programInstanceId: today.activeProgram.id, limit: 8 })
    : { sessions: [], substitutions: [] }
  const acceptedDecisions = today.activeProgram
    ? await getAcceptedDecisionsInternal(supabase, user.id, today.activeProgram.id)
    : []
  return buildProgramOverview({
    today,
    recentSessions: buildProgramRecentSessions(programHistory.sessions, today.activeProgram?.units ?? 'kg'),
    bodyLoad,
    acceptedDecisions,
  })
})

export const getRecentHistoryFn = createServerFn({ method: 'GET' }).handler(async (): Promise<RecentHistoryEntry[]> => {
  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, planned_session_id, status, completed_at, scheduled_date, prescription_snapshot')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  const rows = data ?? []
  const sessionIds = rows.map((row: any) => row.id as string)
  const { data: exercises, error: exerciseError } = sessionIds.length
    ? await supabase
        .from('exercise_logs')
        .select('id, session_id')
        .eq('user_id', user.id)
        .in('session_id', sessionIds)
    : { data: [], error: null }
  if (exerciseError) throw new Error(exerciseError.message)

  const exerciseToSessionId = new Map((exercises ?? []).map((exercise: any) => [exercise.id, exercise.session_id as string]))
  const exerciseIds = Array.from(exerciseToSessionId.keys())
  const { data: sets, error: setError } = exerciseIds.length
    ? await supabase
        .from('set_logs')
        .select('exercise_log_id, completed')
        .eq('user_id', user.id)
        .in('exercise_log_id', exerciseIds)
    : { data: [], error: null }
  if (setError) throw new Error(setError.message)

  const completedSetsBySessionId = new Map<string, number>()
  const loggedSetsBySessionId = new Map<string, number>()
  for (const set of sets ?? []) {
    const sessionId = exerciseToSessionId.get(set.exercise_log_id)
    if (!sessionId) continue
    loggedSetsBySessionId.set(sessionId, (loggedSetsBySessionId.get(sessionId) ?? 0) + 1)
    if (set.completed) {
      completedSetsBySessionId.set(sessionId, (completedSetsBySessionId.get(sessionId) ?? 0) + 1)
    }
  }

  return rows.map((row: any): RecentHistoryEntry => {
    const snapshot = row.prescription_snapshot as PlannedSession | null
    const plannedSetCount = snapshot?.movements.reduce((total, movement) => total + movement.sets.length, 0) ?? 0
    return {
      id: row.id,
      title: snapshot?.title ?? row.planned_session_id,
      completedAt: row.completed_at,
      scheduledDate: row.scheduled_date,
      programTitle: snapshot?.programTitle ?? null,
      weekLabel: snapshot?.weekLabel ?? null,
      hardness: snapshot?.hardness ?? null,
      estimatedMinutes: snapshot?.estimatedMinutes ?? null,
      movementCount: snapshot?.movements.length ?? 0,
      completedSetCount: completedSetsBySessionId.get(row.id) ?? 0,
      plannedSetCount: loggedSetsBySessionId.get(row.id) ?? plannedSetCount,
    }
  })
})

export const getMovementHistoryFn = createServerFn({ method: 'GET' })
  .validator((data: { movementId: string }) => data)
  .handler(async ({ data }): Promise<MovementHistoryEntry[]> => {
    const { supabase, user } = await requireUser()
    const { data: exercises, error } = await supabase
      .from('exercise_logs')
      .select('id, session_id, planned_movement_id, performed_movement_id, role, target_summary, created_at')
      .eq('user_id', user.id)
      .or(`planned_movement_id.eq.${data.movementId},performed_movement_id.eq.${data.movementId}`)
      .order('created_at', { ascending: false })
      .limit(80)
    if (error) throw new Error(error.message)

    const exerciseRows = exercises ?? []
    const exerciseIds = exerciseRows.map((exercise: any) => exercise.id as string)
    const sessionIds = Array.from(new Set(exerciseRows.map((exercise: any) => exercise.session_id as string)))
    if (!exerciseIds.length || !sessionIds.length) return []

    const { data: sessions, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id, planned_session_id, status, completed_at, scheduled_date, prescription_snapshot')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .in('id', sessionIds)
    if (sessionError) throw new Error(sessionError.message)

    const { data: setRows, error: setError } = await supabase
      .from('set_logs')
      .select('id, exercise_log_id, set_index, target_load, target_reps, target_rep_min, target_rep_max, target_rir, actual_load, actual_reps, actual_rir, completed, is_top_set, is_amrap, is_backoff')
      .eq('user_id', user.id)
      .in('exercise_log_id', exerciseIds)
      .order('set_index', { ascending: true })
    if (setError) throw new Error(setError.message)

    const sessionsById = new Map((sessions ?? []).map((session: any) => [session.id, session]))
    const setsByExerciseId = new Map<string, any[]>()
    for (const set of setRows ?? []) {
      const sets = setsByExerciseId.get(set.exercise_log_id) ?? []
      sets.push(set)
      setsByExerciseId.set(set.exercise_log_id, sets)
    }

    return exerciseRows
      .map((exercise: any): MovementHistoryEntry | null => {
        const session = sessionsById.get(exercise.session_id)
        if (!session) return null
        const snapshot = session.prescription_snapshot as PlannedSession | null
        return {
          id: exercise.id,
          sessionId: session.id,
          sessionTitle: snapshot?.title ?? session.planned_session_id,
          programTitle: snapshot?.programTitle ?? null,
          scheduledDate: session.scheduled_date,
          completedAt: session.completed_at,
          units: snapshot?.units ?? null,
          plannedMovementId: exercise.planned_movement_id,
          performedMovementId: exercise.performed_movement_id,
          performedMovementName: getMovementName(exercise.performed_movement_id),
          role: exercise.role,
          targetSummary: exercise.target_summary,
          sets: (setsByExerciseId.get(exercise.id) ?? []).map((set: any) => ({
            id: set.id,
            setIndex: set.set_index,
            targetLoad: set.target_load === null ? null : Number(set.target_load),
            targetReps: set.target_reps,
            targetRepMin: set.target_rep_min,
            targetRepMax: set.target_rep_max,
            targetRir: set.target_rir === null ? null : Number(set.target_rir),
            actualLoad: set.actual_load === null ? null : Number(set.actual_load),
            actualReps: set.actual_reps,
            actualRir: set.actual_rir === null ? null : Number(set.actual_rir),
            completed: set.completed,
            isTopSet: set.is_top_set,
            isAmrap: set.is_amrap,
            isBackoff: set.is_backoff,
          })),
        }
      })
      .filter((entry): entry is MovementHistoryEntry => entry !== null)
      .sort((left, right) => {
        const leftDate = left.completedAt ?? left.scheduledDate
        const rightDate = right.completedAt ?? right.scheduledDate
        return rightDate.localeCompare(leftDate)
      })
      .slice(0, 12)
  })
