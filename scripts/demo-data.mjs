#!/usr/bin/env node
/* global console */

import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const DEMO_PASSWORD = 'DemoPass123!'
const DEMO_EMAIL_DOMAIN = 'sheetless.local'

const DEMO_USERS = [
  {
    email: `demo.linear@${DEMO_EMAIL_DOMAIN}`,
    displayName: 'Maya Linear',
    title: 'Maya - Beginner 5x5 LP',
    templateId: 'generic_alternating_5x5_lp',
    units: 'kg',
    rounding: 2.5,
    completedSessions: 12,
    activeSession: true,
    equipmentProfile: ['barbell', 'plates', 'rack', 'bench', 'dumbbells', 'machine', 'cable'],
    stateKind: 'working_load',
    startValues: {
      squat: 62.5,
      bench_press: 37.5,
      overhead_press: 25,
      deadlift: 85,
      barbell_row: 40,
    },
    currentValues: {
      squat: 80,
      bench_press: 50,
      overhead_press: 32.5,
      deadlift: 115,
      barbell_row: 52.5,
    },
    oneRepMaxes: {
      squat: 115,
      bench_press: 72.5,
      deadlift: 155,
      overhead_press: 47.5,
      barbell_row: 75,
    },
    baseAccessories: {
      leg_press: 110,
      hack_squat: 75,
      lat_pulldown: 47.5,
      seated_cable_row: 52.5,
      chest_supported_row: 45,
      hamstring_curl: 35,
      cable_crunch: 35,
    },
    acceptedDecisions: ['squat', 'bench_press', 'deadlift'],
    pendingDecisions: ['overhead_press', 'barbell_row'],
  },
  {
    email: `demo.wave@${DEMO_EMAIL_DOMAIN}`,
    displayName: 'Alex Wave',
    title: 'Alex - Training Max Wave',
    templateId: 'healthy-531-fsl',
    units: 'kg',
    rounding: 2.5,
    completedSessions: 10,
    activeSession: false,
    equipmentProfile: ['barbell', 'plates', 'rack', 'bench', 'dumbbells', 'cable', 'machine', 'bodyweight'],
    stateKind: 'training_max',
    startValues: {
      squat: 125,
      bench_press: 82.5,
      deadlift: 155,
      overhead_press: 55,
    },
    currentValues: {
      squat: 132.5,
      bench_press: 87.5,
      deadlift: 165,
      overhead_press: 57.5,
    },
    oneRepMaxes: {
      squat: 150,
      bench_press: 100,
      deadlift: 185,
      overhead_press: 67.5,
      barbell_row: 92.5,
    },
    baseAccessories: {
      leg_press: 150,
      hamstring_curl: 45,
      cable_crunch: 42.5,
      chest_supported_row: 55,
      incline_dumbbell_press: 27.5,
      triceps_pressdown: 35,
      romanian_deadlift: 95,
      back_extension: 20,
      lat_pulldown: 60,
      face_pull: 27.5,
      dumbbell_row: 32.5,
    },
    acceptedDecisions: ['squat', 'bench_press'],
    pendingDecisions: ['deadlift'],
  },
  {
    email: `demo.power@${DEMO_EMAIL_DOMAIN}`,
    displayName: 'Jordan Powerbuilding',
    title: 'Jordan - Old School Wave',
    templateId: 'bromley-bullmastiff',
    units: 'kg',
    rounding: 2.5,
    completedSessions: 14,
    activeSession: false,
    equipmentProfile: ['barbell', 'plates', 'rack', 'bench', 'dumbbells', 'cable', 'machine', 'specialty_bars', 'bodyweight'],
    stateKind: 'training_max',
    startValues: {
      squat: 150,
      bench_press: 105,
      deadlift: 185,
      overhead_press: 67.5,
    },
    currentValues: {
      squat: 157.5,
      bench_press: 110,
      deadlift: 195,
      overhead_press: 70,
    },
    oneRepMaxes: {
      squat: 180,
      bench_press: 125,
      deadlift: 220,
      overhead_press: 82.5,
      barbell_row: 115,
    },
    baseAccessories: {
      chest_supported_row: 65,
      lat_pulldown: 65,
      dumbbell_row: 37.5,
      leg_press: 180,
      hack_squat: 115,
      hamstring_curl: 52.5,
      back_extension: 25,
      face_pull: 32.5,
      triceps_pressdown: 42.5,
      incline_dumbbell_press: 32.5,
      romanian_deadlift: 125,
      cable_crunch: 47.5,
    },
    acceptedDecisions: ['squat', 'deadlift'],
    pendingDecisions: ['bench_press'],
  },

  // ---- Onboarding test accounts (onboarding_completed = false) ----
  {
    // Nothing set up → pure first-run: tour auto-runs, all checklist steps empty.
    email: `demo.new@${DEMO_EMAIL_DOMAIN}`,
    displayName: 'Sam New',
    units: 'kg',
    rounding: 2.5,
    equipmentProfile: ['barbell', 'plates', 'rack', 'bench'],
    profileOnly: true,
    onboardingCompleted: false,
  },
  {
    // Strength estimates saved, but no plan or sessions → only the "estimates" step is done.
    email: `demo.estimates@${DEMO_EMAIL_DOMAIN}`,
    displayName: 'Riley Estimates',
    units: 'kg',
    rounding: 2.5,
    equipmentProfile: ['barbell', 'plates', 'rack', 'bench', 'dumbbells', 'cable', 'machine'],
    oneRepMaxes: { squat: 110, bench_press: 75, deadlift: 140, overhead_press: 50, barbell_row: 70 },
    profileOnly: true,
    onboardingCompleted: false,
  },
  {
    // Plan started + estimates, but no completed workout → plan + estimates done, workout not.
    email: `demo.started@${DEMO_EMAIL_DOMAIN}`,
    displayName: 'Casey Started',
    title: 'Casey - Beginner 5x5 (just started)',
    templateId: 'generic_alternating_5x5_lp',
    units: 'kg',
    rounding: 2.5,
    completedSessions: 0,
    activeSession: false,
    equipmentProfile: ['barbell', 'plates', 'rack', 'bench', 'dumbbells', 'machine', 'cable'],
    stateKind: 'working_load',
    startValues: { squat: 60, bench_press: 40, overhead_press: 25, deadlift: 80, barbell_row: 40 },
    currentValues: { squat: 60, bench_press: 40, overhead_press: 25, deadlift: 80, barbell_row: 40 },
    oneRepMaxes: { squat: 90, bench_press: 60, deadlift: 120, overhead_press: 40, barbell_row: 60 },
    baseAccessories: { lat_pulldown: 45, seated_cable_row: 45, hamstring_curl: 30, cable_crunch: 30 },
    acceptedDecisions: [],
    pendingDecisions: [],
    onboardingCompleted: false,
  },
  {
    // Fully set up but onboarding not dismissed → all steps done, "You're all set" state.
    email: `demo.ready@${DEMO_EMAIL_DOMAIN}`,
    displayName: 'Jamie Ready',
    title: 'Jamie - Beginner 5x5',
    templateId: 'generic_alternating_5x5_lp',
    units: 'kg',
    rounding: 2.5,
    completedSessions: 6,
    activeSession: false,
    equipmentProfile: ['barbell', 'plates', 'rack', 'bench', 'dumbbells', 'machine', 'cable'],
    stateKind: 'working_load',
    startValues: { squat: 62.5, bench_press: 37.5, overhead_press: 25, deadlift: 85, barbell_row: 40 },
    currentValues: { squat: 75, bench_press: 47.5, overhead_press: 30, deadlift: 105, barbell_row: 50 },
    oneRepMaxes: { squat: 110, bench_press: 70, deadlift: 150, overhead_press: 45, barbell_row: 72.5 },
    baseAccessories: { leg_press: 100, lat_pulldown: 45, seated_cable_row: 47.5, hamstring_curl: 32.5, cable_crunch: 32.5 },
    acceptedDecisions: ['squat', 'bench_press'],
    pendingDecisions: ['deadlift'],
    onboardingCompleted: false,
  },
]

const action = process.argv[2] ?? 'seed'
const env = loadEnv()
const localStatusEnv = shouldLoadLocalSupabaseStatus() ? loadLocalSupabaseStatusEnv() : {}
const supabaseUrl = process.env.SUPABASE_URL ?? env.SUPABASE_URL ?? localStatusEnv.API_URL ?? 'http://127.0.0.1:54321'
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  env.SUPABASE_SERVICE_ROLE_KEY ??
  localStatusEnv.SERVICE_ROLE_KEY ??
  localStatusEnv.SECRET_KEY
const anonKey = process.env.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? localStatusEnv.ANON_KEY
const needsSupabaseAdmin = action === 'seed' || action === 'refresh' || action === 'reset'
const needsSignedInClient = action === 'seed' || action === 'refresh' || action === 'verify'

if (needsSupabaseAdmin && !serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Start local Supabase with `pnpm exec supabase start`, or run `pnpm exec supabase status -o env` and copy SERVICE_ROLE_KEY into .env as SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (needsSignedInClient && !anonKey) {
  console.error('Missing SUPABASE_ANON_KEY.')
  console.error('Start local Supabase with `pnpm exec supabase start`, or copy ANON_KEY into .env as SUPABASE_ANON_KEY.')
  process.exit(1)
}

const adminClient = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

try {
  if (action === 'reset') {
    await resetDemoUsers()
  } else if (action === 'seed' || action === 'refresh') {
    await resetDemoUsers()
    await seedDemoUsers()
  } else if (action === 'verify') {
    await verifyDemoUsers()
  } else if (action === 'list') {
    printDemoUsers()
  } else {
    console.error(`Unknown action: ${action}`)
    console.error('Use one of: seed, refresh, reset, verify, list')
    process.exit(1)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

function shouldLoadLocalSupabaseStatus() {
  if (action === 'list') return false
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY)
  const hasAnonKey = Boolean(process.env.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY)
  return !hasServiceRoleKey || !hasAnonKey
}

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return {}
  const result = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    result[key] = value
  }
  return result
}

function loadLocalSupabaseStatusEnv() {
  try {
    const output = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return parseEnvOutput(output)
  } catch {
    return {}
  }
}

function parseEnvOutput(output) {
  const result = {}
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    result[key] = value
  }
  return result
}

async function resetDemoUsers() {
  const emails = new Set(DEMO_USERS.map((user) => user.email))
  const users = await listAuthUsers()
  const demoUsers = users.filter((user) => user.email && emails.has(user.email))

  for (const user of demoUsers) {
    const { error } = await adminClient.auth.admin.deleteUser(user.id)
    if (error) throw new Error(`Unable to delete ${user.email}: ${error.message}`)
  }

  console.log(`Reset ${demoUsers.length} demo user${demoUsers.length === 1 ? '' : 's'}.`)
}

async function seedDemoUsers() {
  for (const demo of DEMO_USERS) {
    const authUser = await createDemoAuthUser(demo)
    const userClient = await createSignedInClient(demo)
    await seedProfile(userClient, authUser.id, demo)
    if (!demo.profileOnly) await seedProgram(userClient, authUser.id, demo)
    await userClient.auth.signOut()
  }

  printDemoUsers()
}

async function verifyDemoUsers() {
  console.log('\nDemo seed verification:')
  for (const demo of DEMO_USERS) {
    const client = await createSignedInClient(demo)
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, display_name')
      .eq('email', demo.email)
      .maybeSingle()
    if (profileError) throw new Error(`Unable to verify ${demo.email}: ${profileError.message}`)
    if (!profile) {
      console.log(`- ${demo.displayName}: missing profile`)
      await client.auth.signOut()
      continue
    }

    const { data: programs, error: programError } = await client
      .from('program_instances')
      .select('id, title, template_id, status')
      .eq('user_id', profile.id)
    if (programError) throw new Error(`Unable to verify programmes for ${demo.email}: ${programError.message}`)

    const activeProgram = (programs ?? []).find((program) => program.status === 'active')
    if (!activeProgram) {
      console.log(`- ${demo.displayName}: profile found, no active programme`)
      await client.auth.signOut()
      continue
    }

    const { data: sessions, error: sessionError } = await client
      .from('workout_sessions')
      .select('id, status')
      .eq('user_id', profile.id)
      .eq('program_instance_id', activeProgram.id)
    if (sessionError) throw new Error(`Unable to verify sessions for ${demo.email}: ${sessionError.message}`)

    const sessionIds = (sessions ?? []).map((session) => session.id)
    const completedSessions = (sessions ?? []).filter((session) => session.status === 'completed').length
    const activeSessions = (sessions ?? []).filter((session) => session.status === 'in_progress').length
    const exercises = sessionIds.length
      ? await countRows(client, 'exercise_logs', profile.id, 'session_id', sessionIds)
      : 0
    const exerciseIds = sessionIds.length
      ? await listIds(client, 'exercise_logs', profile.id, 'session_id', sessionIds)
      : []
    const sets = exerciseIds.length
      ? await countRows(client, 'set_logs', profile.id, 'exercise_log_id', exerciseIds)
      : 0
    const decisions = await countRows(client, 'progression_decisions', profile.id, 'program_instance_id', [activeProgram.id])

    console.log(
      `- ${demo.displayName}: ${activeProgram.template_id}, ${completedSessions} completed session${completedSessions === 1 ? '' : 's'}, ${activeSessions} active, ${exercises} exercises, ${sets} sets, ${decisions} progression decision${decisions === 1 ? '' : 's'}`,
    )
    await client.auth.signOut()
  }
  console.log('')
}

async function listAuthUsers() {
  const users = []
  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Unable to list auth users: ${error.message}`)
    users.push(...(data.users ?? []))
    if (!data.users?.length || data.users.length < 1000) break
  }
  return users
}

async function createDemoAuthUser(demo) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email: demo.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      display_name: demo.displayName,
      demo_user: true,
    },
  })
  if (error) throw new Error(`Unable to create ${demo.email}: ${error.message}`)
  if (!data.user) throw new Error(`Unable to create ${demo.email}: no user returned`)
  return data.user
}

async function createSignedInClient(demo) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const { error } = await client.auth.signInWithPassword({
    email: demo.email,
    password: DEMO_PASSWORD,
  })
  if (error) throw new Error(`Unable to sign in ${demo.email} for demo seeding: ${error.message}`)
  return client
}

async function countRows(client, table, userId, column, values) {
  const { count, error } = await client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in(column, values)
  if (error) throw new Error(`Unable to count ${table}: ${error.message}`)
  return count ?? 0
}

async function listIds(client, table, userId, column, values) {
  const { data, error } = await client
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .in(column, values)
  if (error) throw new Error(`Unable to list ${table}: ${error.message}`)
  return (data ?? []).map((row) => row.id)
}

async function seedProfile(client, userId, demo) {
  const { error } = await client.from('profiles').upsert({
    id: userId,
    email: demo.email,
    display_name: demo.displayName,
    units: demo.units,
    rounding: demo.rounding,
    theme_preference: 'system',
    equipment_profile: demo.equipmentProfile,
    program_state_defaults: profileDefaultsForDemo(demo),
    onboarding_completed: demo.onboardingCompleted ?? true,
  }, { onConflict: 'id' })
  if (error) throw new Error(`Unable to seed profile for ${demo.email}: ${error.message}`)
}

async function seedProgram(client, userId, demo) {
  const { template, version, definition } = await getTemplate(client, demo.templateId)
  const startDate = daysAgo(Math.ceil(demo.completedSessions * daysBetweenSessions(definition)) + 3)
  const program = {
    id: null,
    templateId: template.id,
    templateVersionId: version.id,
    title: demo.title,
    status: 'active',
    startDate,
    units: demo.units,
    rounding: demo.rounding,
    currentWeekIndex: demo.completedSessions,
    customizationStatus: 'default',
    customizationSummary: { movementOverrideCount: 0, accessoryAdditionCount: 0 },
    stateValues: stateValuesForDemo(definition, demo, demo.completedSessions),
    movementOverrides: [],
    accessoryAdditions: accessoryAdditionsForDemo(demo),
    templateDefinition: definition,
  }

  const { data: instance, error: instanceError } = await client
    .from('program_instances')
    .insert({
      user_id: userId,
      template_id: template.id,
      template_version_id: version.id,
      title: demo.title,
      status: 'active',
      start_date: startDate,
      units: demo.units,
      rounding: demo.rounding,
      current_block_id: phaseKeyForIndex(definition, demo.completedSessions),
      current_week_index: demo.completedSessions,
      customization_status: program.accessoryAdditions.length ? 'customized' : 'default',
      customization_summary: {
        movementOverrideCount: 0,
        accessoryAdditionCount: program.accessoryAdditions.length,
      },
    })
    .select('*')
    .single()
  if (instanceError) throw new Error(`Unable to seed programme for ${demo.email}: ${instanceError.message}`)

  program.id = instance.id
  await insertStateValues(client, userId, program)
  await insertAccessoryAdditions(client, userId, program)

  for (let sessionIndex = 0; sessionIndex < demo.completedSessions; sessionIndex += 1) {
    const sessionProgram = {
      ...program,
      currentWeekIndex: sessionIndex,
      stateValues: stateValuesForDemo(definition, demo, sessionIndex),
    }
    const spacing = daysBetweenSessions(definition)
    const scheduledDate = daysAgo((demo.completedSessions - sessionIndex) * spacing + (demo.activeSession ? 1 : 0))
    const plannedSession = expandPlannedSession(sessionProgram, definition, scheduledDate)
    await insertWorkoutSession(client, userId, program.id, plannedSession, demo, sessionIndex, 'completed')
  }

  if (demo.activeSession) {
    const plannedSession = expandPlannedSession(program, definition, todayIsoDate())
    await insertWorkoutSession(client, userId, program.id, plannedSession, demo, demo.completedSessions, 'in_progress')
  }

  await insertProgressionDecisions(client, userId, program.id, demo)
  console.log(`Seeded ${demo.displayName}: ${demo.email}`)
}

async function getTemplate(client, templateId) {
  const { data: template, error: templateError } = await client
    .from('program_templates')
    .select('*')
    .eq('id', templateId)
    .single()
  if (templateError) throw new Error(`Template ${templateId} not found. Run \`pnpm db:migrate:local\` first. ${templateError.message}`)

  const { data: versions, error: versionError } = await client
    .from('program_template_versions')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (versionError) throw new Error(`Unable to load template ${templateId}: ${versionError.message}`)
  const version = versions?.[0]
  if (!version) throw new Error(`Template ${templateId} has no versions. Run \`pnpm db:migrate:local\` first.`)

  return {
    template,
    version,
    definition: version.definition,
  }
}

async function insertStateValues(client, userId, program) {
  if (!program.stateValues.length) return
  const { error } = await client.from('program_state_values').insert(
    program.stateValues.map((state) => ({
      user_id: userId,
      program_instance_id: program.id,
      key: state.key,
      movement_id: state.movementId,
      state_type: state.type,
      label: state.label ?? null,
      value: state.value,
      unit: program.units,
      metadata: { source: 'demo_seed' },
    })),
  )
  if (error) throw new Error(`Unable to seed programme state: ${error.message}`)
}

async function insertAccessoryAdditions(client, userId, program) {
  if (!program.accessoryAdditions.length) return
  const { error } = await client.from('program_accessory_additions').insert(
    program.accessoryAdditions.map((addition) => ({
      user_id: userId,
      program_instance_id: program.id,
      session_id: addition.sessionId,
      slot_id: addition.slotId,
      phase_key: addition.phaseKey,
      movement_id: addition.movementId,
      prescription_id: addition.prescriptionId,
      source_slot_id: addition.sourceSlotId,
      target_summary: addition.targetSummary,
      sets: addition.sets,
      note: addition.note,
      progression_method: addition.progressionMethod,
      effective_from_week_index: addition.effectiveFromWeekIndex,
      order_index: addition.orderIndex,
    })),
  )
  if (error) throw new Error(`Unable to seed accessory additions: ${error.message}`)
}

async function insertWorkoutSession(client, userId, programInstanceId, plannedSession, demo, sessionIndex, status) {
  const startedAt = timestampForDate(plannedSession.scheduledDate, status === 'completed' ? 17 : 9)
  const completedAt = status === 'completed' ? timestampForDate(plannedSession.scheduledDate, 18.25) : null
  const sessionSnapshot = status === 'in_progress'
    ? completeSnapshotPartially(plannedSession)
    : plannedSession

  const { data: session, error: sessionError } = await client
    .from('workout_sessions')
    .insert({
      user_id: userId,
      program_instance_id: programInstanceId,
      planned_session_id: plannedSession.id,
      status,
      scheduled_date: plannedSession.scheduledDate,
      started_at: startedAt,
      completed_at: completedAt,
      prescription_snapshot: sessionSnapshot,
      notes: status === 'completed' ? sessionNote(sessionIndex, plannedSession) : 'Demo session in progress.',
      client_mutation_id: `demo-${demo.email}-${status}-${sessionIndex}`,
    })
    .select('*')
    .single()
  if (sessionError) throw new Error(`Unable to seed session ${plannedSession.title}: ${sessionError.message}`)

  for (const movement of plannedSession.movements) {
    const performedMovementId = performedMovementForDemo(demo, movement, sessionIndex)
    const { data: exercise, error: exerciseError } = await client
      .from('exercise_logs')
      .insert({
        user_id: userId,
        session_id: session.id,
        slot_id: movement.slotId ?? movement.id,
        planned_movement_id: movement.movementId,
        performed_movement_id: performedMovementId,
        role: movement.role,
        order_index: movement.orderIndex,
        target_summary: movement.targetSummary,
        notes: movement.isAdded ? movement.notes ?? 'Added accessory for the block.' : null,
        client_mutation_id: `demo-${demo.email}-${sessionIndex}-${movement.slotId ?? movement.id}`,
      })
      .select('*')
      .single()
    if (exerciseError) throw new Error(`Unable to seed exercise ${movement.movementName}: ${exerciseError.message}`)

    const setRows = movement.sets.map((set) => setLogRow({
      userId,
      exerciseId: exercise.id,
      set,
      movement,
      demo,
      sessionIndex,
      status,
    }))
    const { error: setError } = await client.from('set_logs').insert(setRows)
    if (setError) throw new Error(`Unable to seed sets for ${movement.movementName}: ${setError.message}`)

    if (performedMovementId !== movement.movementId) {
      const { error: substitutionError } = await client.from('substitution_logs').insert({
        user_id: userId,
        session_id: session.id,
        slot_id: movement.slotId ?? movement.id,
        planned_movement_id: movement.movementId,
        performed_movement_id: performedMovementId,
        reason: 'crowded_gym',
        note: 'Demo swap: chosen because the planned station was busy.',
        created_at: startedAt,
      })
      if (substitutionError) throw new Error(`Unable to seed substitution: ${substitutionError.message}`)
    }
  }
}

async function insertProgressionDecisions(client, userId, programInstanceId, demo) {
  const rows = []
  const now = new Date()

  for (const movementId of demo.acceptedDecisions ?? []) {
    const previousValue = demo.currentValues[movementId] - incrementFor(demo.stateKind, movementId)
    const recommendedValue = demo.currentValues[movementId]
    rows.push({
      user_id: userId,
      program_instance_id: programInstanceId,
      movement_id: movementId,
      rule_id: demo.stateKind === 'working_load' ? 'simple_linear_completion' : 'training_max_review',
      scope: demo.stateKind === 'working_load' ? 'session' : 'cycle',
      status: 'accepted',
      input_summary: `Demo trend: ${formatMovementName(movementId)} completed target work with reps in reserve.`,
      recommendation: `Increase ${demo.stateKind.replace('_', ' ')} to ${recommendedValue} ${demo.units}.`,
      state_key: `${movementId}_${demo.stateKind}`,
      state_type: demo.stateKind,
      previous_value: previousValue,
      recommended_value: recommendedValue,
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  for (const movementId of demo.pendingDecisions ?? []) {
    const previousValue = demo.currentValues[movementId]
    const recommendedValue = previousValue + incrementFor(demo.stateKind, movementId)
    rows.push({
      user_id: userId,
      program_instance_id: programInstanceId,
      movement_id: movementId,
      rule_id: demo.stateKind === 'working_load' ? 'simple_linear_completion' : 'training_max_review',
      scope: demo.stateKind === 'working_load' ? 'session' : 'cycle',
      status: 'pending',
      input_summary: `Demo trend: ${formatMovementName(movementId)} has enough completed work for review.`,
      recommendation: `Consider ${recommendedValue} ${demo.units} next time.`,
      state_key: `${movementId}_${demo.stateKind}`,
      state_type: demo.stateKind,
      previous_value: previousValue,
      recommended_value: recommendedValue,
      created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
    })
  }

  if (!rows.length) return
  const { error } = await client.from('progression_decisions').insert(rows)
  if (error) throw new Error(`Unable to seed progression decisions: ${error.message}`)
}

function expandPlannedSession(program, definition, scheduledDate) {
  const sessionIndex = positiveModulo(program.currentWeekIndex, definition.daysPerWeek)
  const programmeWeekIndex = positiveModulo(
    Math.floor(program.currentWeekIndex / definition.daysPerWeek),
    definition.durationWeeks,
  )
  const session = definition.sessions[sessionIndex]
  const week = definition.weeks[programmeWeekIndex]
  if (!session || !week) throw new Error(`Cannot expand ${program.templateId} at week index ${program.currentWeekIndex}`)

  const movements = session.slots.map((slot, index) => {
    const prescription = week.prescriptions[slot.prescriptionId]
    if (!prescription) throw new Error(`Missing prescription ${slot.prescriptionId}`)
    const plannedMovementId = resolveMovementId(slot.movementId, week.phaseKey)
    const movementId = plannedMovementId
    const slotId = `slot-${session.id}-${slot.id}`
    return {
      id: slotId,
      slotId,
      phaseKey: week.phaseKey,
      movementId,
      movementName: formatMovementName(movementId),
      role: slot.role,
      orderIndex: index + 1,
      targetSummary: slot.targetSummary ?? prescription.targetSummary,
      progressionRuleId: prescription.progressionRuleId ?? null,
      sets: prescription.sets.map((set, setIndex) =>
        expandSet(set, setIndex, {
          stateValues: program.stateValues,
          movementId,
          anchorMovementId: slot.anchorMovementId ?? plannedMovementId,
          rounding: program.rounding,
          units: program.units,
        }),
      ),
      previous: null,
    }
  })

  const additions = (program.accessoryAdditions ?? [])
    .filter((addition) => {
      if (addition.sessionId !== session.id) return false
      if (addition.effectiveFromWeekIndex > program.currentWeekIndex) return false
      return addition.phaseKey === '*' || addition.phaseKey === week.phaseKey
    })
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((addition, additionIndex) => ({
      id: `slot-${session.id}-${addition.slotId}`,
      slotId: `slot-${session.id}-${addition.slotId}`,
      phaseKey: week.phaseKey,
      movementId: addition.movementId,
      movementName: formatMovementName(addition.movementId),
      role: 'accessory',
      orderIndex: session.slots.length + additionIndex + 1,
      targetSummary: addition.targetSummary,
      progressionRuleId: addition.progressionMethod === 'double_progression' ? 'accessory_double_progression' : null,
      progressionMethod: addition.progressionMethod,
      sets: addition.sets.map((set, setIndex) => expandSet(set, setIndex, {
        stateValues: program.stateValues,
        movementId: addition.movementId,
        anchorMovementId: addition.movementId,
        rounding: program.rounding,
        units: program.units,
      })),
      previous: null,
      isAdded: true,
      addedScope: 'phase_slot',
      notes: addition.note,
    }))

  return {
    id: `${session.id}-w${programmeWeekIndex + 1}`,
    templateSessionId: session.id,
    title: session.title,
    programTitle: program.title,
    templateId: program.templateId,
    weekIndex: program.currentWeekIndex,
    weekLabel: week.waveLabel
      ? `${week.phaseLabel.replace(/\s+phase$/i, '')} ${week.waveLabel} - ${week.label}`
      : week.label,
    hardness: week.hardness,
    scheduledDate,
    estimatedMinutes: session.estimatedMinutes,
    units: program.units,
    rounding: program.rounding,
    movements: [...movements, ...additions],
  }
}

function expandSet(set, setIndex, context) {
  return {
    id: `set-${setIndex + 1}`,
    setIndex: setIndex + 1,
    targetLoad: resolveTargetLoad(set.targetLoad, context),
    targetReps: set.targetReps ?? null,
    targetRepMin: set.targetRepMin ?? null,
    targetRepMax: set.targetRepMax ?? null,
    targetRpe: set.targetRpe ?? null,
    targetRir: set.targetRir ?? null,
    isTopSet: Boolean(set.isTopSet),
    isAmrap: Boolean(set.isAmrap),
    isBackoff: Boolean(set.isBackoff),
    label: set.label ?? null,
  }
}

function resolveTargetLoad(targetLoad, context) {
  if (!targetLoad || targetLoad.kind === 'user_selected') return null
  if (targetLoad.kind === 'fixed') {
    const value = context.units === 'lb' ? targetLoad.lb ?? targetLoad.kg : targetLoad.kg ?? targetLoad.lb
    return isPositiveNumber(value) ? roundToStep(value, context.rounding) : null
  }
  if (targetLoad.kind === 'state') {
    const stateKey = targetLoad.stateKey ?? `${context.movementId}_${targetLoad.stateType}`
    return findStateValue(context.stateValues, stateKey)
  }
  if (targetLoad.kind === 'percent' || targetLoad.kind === 'percent_of_state') {
    const stateType = targetLoad.anchor ?? targetLoad.stateType
    const stateKey = targetLoad.stateKey ?? `${context.anchorMovementId}_${stateType}`
    const value = findStateValue(context.stateValues, stateKey)
    return isPositiveNumber(value) ? roundToStep(value * targetLoad.percent, context.rounding) : null
  }
  return null
}

function stateValuesForDemo(definition, demo, sessionIndex) {
  return definition.requiredState.map((state) => {
    const current = demo.currentValues[state.movementId] ?? demo.startValues[state.movementId]
    const start = demo.startValues[state.movementId] ?? current
    const value = interpolateLoad(start, current, sessionIndex, demo.completedSessions, demo.rounding)
    return {
      key: state.key,
      movementId: state.movementId,
      type: state.type,
      label: state.label ?? null,
      value,
      unit: demo.units,
    }
  })
}

function profileDefaultsForDemo(demo) {
  const defaults = {}
  for (const [movementId, value] of Object.entries(demo.oneRepMaxes ?? {})) {
    defaults[`${movementId}_one_rep_max`] = value
  }
  for (const [movementId, value] of Object.entries(demo.currentValues ?? {})) {
    defaults[`${movementId}_${demo.stateKind}`] = value
  }
  return defaults
}

function accessoryAdditionsForDemo(demo) {
  if (demo.templateId === 'generic_alternating_5x5_lp') {
    return [
      accessoryAddition('day-1', 'added-face-pull', 'face_pull', '12-20 reps - history only', 0, 4),
      accessoryAddition('day-2', 'added-cable-crunch', 'cable_crunch', '10-15 reps - double progression', 0, 4, 'double_progression'),
    ]
  }
  if (demo.templateId === 'bromley-bullmastiff') {
    return [
      accessoryAddition('day-1', 'added-hanging-leg-raise', 'hanging_leg_raise', '10-20 reps - history only', 4, 5),
    ]
  }
  return []
}

function accessoryAddition(sessionId, slotId, movementId, targetSummary, effectiveFromWeekIndex, orderIndex, progressionMethod = 'history_only') {
  return {
    sessionId,
    slotId,
    phaseKey: '*',
    movementId,
    prescriptionId: `demo-${slotId}`,
    sourceSlotId: null,
    targetSummary,
    sets: Array.from({ length: 3 }, (_, index) => ({
      id: `set-${index + 1}`,
      setIndex: index + 1,
      targetLoad: null,
      targetRepMin: targetSummary.includes('12-20') ? 12 : 10,
      targetRepMax: targetSummary.includes('12-20') || targetSummary.includes('10-20') ? 20 : 15,
      targetRir: progressionMethod === 'double_progression' ? 2 : null,
      label: targetSummary.includes('12-20') ? '12-20' : targetSummary.includes('10-20') ? '10-20' : '10-15',
    })),
    note: 'Demo block accessory.',
    progressionMethod,
    effectiveFromWeekIndex,
    orderIndex,
  }
}

function setLogRow({ userId, exerciseId, set, movement, demo, sessionIndex, status }) {
  const completed = status === 'completed' || (status === 'in_progress' && movement.orderIndex === 1 && set.setIndex <= 2)
  const actual = actualSetValues({ set, movement, demo, sessionIndex, completed })
  return {
    user_id: userId,
    exercise_log_id: exerciseId,
    set_index: set.setIndex,
    target_load: set.targetLoad,
    target_reps: set.targetReps,
    target_rep_min: set.targetRepMin,
    target_rep_max: set.targetRepMax,
    target_rpe: set.targetRpe,
    target_rir: set.targetRir,
    actual_load: actual.load,
    actual_reps: actual.reps,
    actual_rpe: actual.rpe,
    actual_rir: actual.rir,
    completed,
    is_top_set: Boolean(set.isTopSet),
    is_amrap: Boolean(set.isAmrap),
    is_backoff: Boolean(set.isBackoff),
    note: actual.note,
    client_mutation_id: completed ? `demo-${exerciseId}-${set.setIndex}` : null,
  }
}

function actualSetValues({ set, movement, demo, sessionIndex, completed }) {
  if (!completed) {
    return { load: null, reps: null, rpe: null, rir: null, note: null }
  }

  const baseLoad = set.targetLoad ?? demo.baseAccessories[movement.movementId] ?? fallbackLoad(movement.movementId)
  const load = roundToStep(baseLoad + smallJitter(demo.email, movement.movementId, sessionIndex, set.setIndex), demo.rounding)
  const min = set.targetRepMin ?? set.targetReps ?? 8
  const max = set.targetRepMax ?? set.targetReps ?? min
  const amrapBonus = set.isAmrap ? 2 + deterministicNumber(demo.email, movement.movementId, sessionIndex, set.setIndex, 4) : 0
  const range = Math.max(0, max - min)
  const reps = Math.max(1, Math.min(max + amrapBonus, min + deterministicNumber(movement.movementId, demo.email, set.setIndex, sessionIndex, range + 1) + amrapBonus))
  const rir = set.isAmrap ? 1 : movement.role === 'accessory' ? 1 + deterministicNumber(demo.email, movement.movementId, set.setIndex, sessionIndex, 3) : 2
  const rpe = set.targetRpe ?? null
  return {
    load,
    reps,
    rpe,
    rir,
    note: set.isAmrap && reps > (set.targetReps ?? 0) + 2 ? 'Strong demo top set.' : null,
  }
}

function completeSnapshotPartially(plannedSession) {
  return {
    ...plannedSession,
    movements: plannedSession.movements.map((movement) => ({
      ...movement,
      sets: movement.sets.map((set) => ({
        ...set,
        completed: movement.orderIndex === 1 && set.setIndex <= 2,
      })),
    })),
  }
}

function performedMovementForDemo(demo, movement, sessionIndex) {
  if (demo.templateId === 'bromley-bullmastiff' && sessionIndex === 7 && movement.movementId === 'lat_pulldown') {
    return 'pull_up'
  }
  if (demo.templateId === 'healthy-531-fsl' && sessionIndex === 5 && movement.movementId === 'chest_supported_row') {
    return 'seated_cable_row'
  }
  return movement.movementId
}

function resolveMovementId(movementId, phaseKey) {
  if (typeof movementId === 'string') return movementId
  return movementId.byPhase?.[phaseKey] ?? movementId.default
}

function findStateValue(stateValues, key) {
  const state = stateValues.find((item) => item.key === key)
  return state?.value ?? null
}

function interpolateLoad(start, current, sessionIndex, totalSessions, rounding) {
  if (!isPositiveNumber(start)) return current
  if (!isPositiveNumber(current)) return start
  const ratio = totalSessions <= 1 ? 1 : Math.min(1, sessionIndex / totalSessions)
  return roundToStep(start + (current - start) * ratio, rounding)
}

function incrementFor(stateKind, movementId) {
  if (stateKind === 'training_max') return movementId === 'deadlift' || movementId === 'squat' ? 5 : 2.5
  return movementId === 'deadlift' ? 5 : 2.5
}

function phaseKeyForIndex(definition, currentWeekIndex) {
  const programmeWeekIndex = positiveModulo(
    Math.floor(currentWeekIndex / definition.daysPerWeek),
    definition.durationWeeks,
  )
  return definition.weeks[programmeWeekIndex]?.phaseKey ?? null
}

function daysBetweenSessions(definition) {
  return definition.daysPerWeek >= 4 ? 2 : 3
}

function sessionNote(sessionIndex, plannedSession) {
  const notes = [
    'Moved well; no pain.',
    'Kept rest tight and logged RIR honestly.',
    'Small form cue carried over from last time.',
    'Good demo session for history and progression.',
  ]
  return `${notes[sessionIndex % notes.length]} ${plannedSession.hardness} day.`
}

function fallbackLoad(movementId) {
  if (movementId.includes('curl') || movementId.includes('face_pull')) return 25
  if (movementId.includes('crunch') || movementId.includes('raise')) return 20
  if (movementId.includes('row') || movementId.includes('pulldown')) return 50
  if (movementId.includes('press')) return 30
  if (movementId.includes('squat') || movementId.includes('leg_press')) return 90
  if (movementId.includes('deadlift') || movementId.includes('hinge')) return 100
  return 40
}

function formatMovementName(value) {
  const known = {
    squat: 'Squat',
    bench_press: 'Bench Press',
    deadlift: 'Deadlift',
    overhead_press: 'Overhead Press',
    barbell_row: 'Barbell Row',
  }
  return known[value] ?? value.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function roundToStep(value, step) {
  if (!Number.isFinite(value)) return 0
  if (!step) return value
  return Math.round(value / step) * step
}

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo
}

function deterministicNumber(...parts) {
  const max = Number(parts.at(-1))
  const input = parts.slice(0, -1).join(':')
  if (!Number.isFinite(max) || max <= 0) return 0
  const hash = crypto.createHash('sha256').update(input).digest()
  return hash[0] % max
}

function smallJitter(...parts) {
  const raw = deterministicNumber(...parts, 5) - 2
  return raw * 0.5
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function timestampForDate(date, hour) {
  const [hours, fraction = 0] = String(hour).split('.').map(Number)
  const minutes = Math.round((fraction / 100) * 60)
  return `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`
}

function printDemoUsers() {
  console.log('\nDemo users:')
  for (const user of DEMO_USERS) {
    console.log(`- ${user.displayName}: ${user.email} / ${DEMO_PASSWORD} (${user.templateId ?? 'profile only'})`)
  }
  console.log('')
}
