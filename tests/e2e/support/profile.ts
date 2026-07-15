import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { DEMO_USER, type Credentials } from './auth'

/**
 * Sign in a throwaway Supabase client as a demo account (never signed out — that would
 * revoke the session the browser under test is using) and resolve its auth user id.
 */
async function signInClient(credentials: Credentials) {
  const { supabaseUrl, anonKey } = getSupabaseTestEnv()
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const { error: authError } = await client.auth.signInWithPassword(credentials)
  if (authError) throw new Error(`Unable to sign in ${credentials.email} for profile setup: ${authError.message}`)

  const { data, error: userError } = await client.auth.getUser()
  if (userError) throw new Error(`Unable to read ${credentials.email} for profile setup: ${userError.message}`)
  if (!data.user) throw new Error(`Unable to read ${credentials.email} for profile setup: no user returned`)

  return { client, userId: data.user.id }
}

/** Resolve a demo account's auth user id (for user-scoped localStorage keys). */
export async function getUserId(credentials: Credentials): Promise<string> {
  const { userId } = await signInClient(credentials)
  return userId
}

export async function getAccessoryCustomizationState(credentials: Credentials) {
  const { client, userId } = await signInClient(credentials)
  const { data: program, error: programError } = await client
    .from('program_instances')
    .select('id, customization_status, customization_summary')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  if (programError) throw new Error(`Unable to read ${credentials.email} programme: ${programError.message}`)

  const { data: additions, error: additionsError } = await client
    .from('program_accessory_additions')
    .select('movement_id, order_index')
    .eq('user_id', userId)
    .eq('program_instance_id', program.id)
    .order('order_index')
  if (additionsError) {
    throw new Error(`Unable to read ${credentials.email} accessory additions: ${additionsError.message}`)
  }

  const summary = program.customization_summary
  const accessoryAdditionCount = summary && typeof summary === 'object' && !Array.isArray(summary)
    ? Number(summary.accessoryAdditionCount ?? 0)
    : 0
  return {
    movementIds: (additions ?? []).map((addition) => addition.movement_id),
    customizationStatus: program.customization_status,
    accessoryAdditionCount,
  }
}

export async function resetAccessoryCustomizationState(credentials: Credentials) {
  const { client, userId } = await signInClient(credentials)
  const { data: program, error: programError } = await client
    .from('program_instances')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  if (programError) throw new Error(`Unable to read ${credentials.email} programme: ${programError.message}`)

  const { error: additionsError } = await client
    .from('program_accessory_additions')
    .delete()
    .eq('user_id', userId)
    .eq('program_instance_id', program.id)
  if (additionsError) {
    throw new Error(`Unable to reset ${credentials.email} accessory additions: ${additionsError.message}`)
  }

  const { count: movementOverrideCount, error: overridesError } = await client
    .from('program_movement_overrides')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('program_instance_id', program.id)
  if (overridesError) {
    throw new Error(`Unable to read ${credentials.email} movement overrides: ${overridesError.message}`)
  }

  const overrideCount = movementOverrideCount ?? 0
  const { error: summaryError } = await client
    .from('program_instances')
    .update({
      customization_status: overrideCount ? 'customized' : 'default',
      customization_summary: {
        movementOverrideCount: overrideCount,
        accessoryAdditionCount: 0,
      },
    })
    .eq('id', program.id)
    .eq('user_id', userId)
  if (summaryError) {
    throw new Error(`Unable to reset ${credentials.email} customization summary: ${summaryError.message}`)
  }
}

async function updateProfile(credentials: Credentials, patch: Record<string, unknown>): Promise<string> {
  const { client, userId } = await signInClient(credentials)
  const { error } = await client.from('profiles').update(patch).eq('id', userId)
  if (error) throw new Error(`Unable to update profile flags for ${credentials.email}: ${error.message}`)
  return userId
}

/**
 * Toggle an account's Today-page onboarding flag so checklist tests are deterministic.
 * Returns the account's user id (handy for the user-scoped tour-autorun key).
 */
export function setOnboardingCompleted(credentials: Credentials, value: boolean): Promise<string> {
  return updateProfile(credentials, { onboarding_completed: value })
}

/**
 * Toggle the demo user's `live_onboarding_dismissed` flag so onboarding card/tour
 * tests are deterministic. Shared by the live (Overview) and focus walkthrough specs.
 */
export async function setLiveOnboardingDismissed(value: boolean) {
  await updateProfile(DEMO_USER, { live_onboarding_dismissed: value })
}

/** Reset the demo user's rest-timer auto-start flag so the timer spec is deterministic. */
export async function setAutoStartTimer(value: boolean) {
  await updateProfile(DEMO_USER, { auto_start_timer: value })
}

function getSupabaseTestEnv() {
  const fileEnv = loadEnvFile()
  const needsLocalEnv =
    !(process.env.SUPABASE_URL ?? fileEnv.SUPABASE_URL) ||
    !(process.env.SUPABASE_ANON_KEY ?? fileEnv.SUPABASE_ANON_KEY)
  const localEnv = needsLocalEnv ? getLocalSupabaseEnv() : {}
  const supabaseUrl = process.env.SUPABASE_URL ?? fileEnv.SUPABASE_URL ?? localEnv.API_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? fileEnv.SUPABASE_ANON_KEY ?? localEnv.ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing SUPABASE_URL/SUPABASE_ANON_KEY for onboarding e2e setup.')
  }
  return { supabaseUrl, anonKey }
}

function loadEnvFile(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return {}
  const result: Record<string, string> = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    result[key] = value
  }
  return result
}

let localSupabaseEnv: Record<string, string> | null = null

function getLocalSupabaseEnv() {
  if (localSupabaseEnv) return localSupabaseEnv
  const output = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  localSupabaseEnv = {}
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    localSupabaseEnv[key] = value
  }
  return localSupabaseEnv
}
