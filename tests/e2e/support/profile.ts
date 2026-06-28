import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { DEMO_USER } from './auth'

/**
 * Toggle the demo user's `live_onboarding_dismissed` flag so onboarding card/tour
 * tests are deterministic. Shared by the live (Overview) and focus walkthrough specs.
 */
export async function setLiveOnboardingDismissed(value: boolean) {
  const { supabaseUrl, anonKey } = getSupabaseTestEnv()
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const { error: authError } = await client.auth.signInWithPassword(DEMO_USER)
  if (authError) throw new Error(`Unable to sign in demo user for onboarding setup: ${authError.message}`)

  const { data, error: userError } = await client.auth.getUser()
  if (userError) throw new Error(`Unable to read demo user for onboarding setup: ${userError.message}`)
  if (!data.user) throw new Error('Unable to read demo user for onboarding setup: no user returned')

  const { error } = await client
    .from('profiles')
    .update({ live_onboarding_dismissed: value })
    .eq('id', data.user.id)
  if (error) throw new Error(`Unable to reset live onboarding flag: ${error.message}`)
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
