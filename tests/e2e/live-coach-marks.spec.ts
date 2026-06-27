import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { DEMO_USER } from './support/auth'

test.beforeEach(async () => {
  await setLiveOnboardingDismissed(false)
})

test('in-session onboarding card starts, dismisses, and replay still works', async ({ page }) => {
  // Get onto a live session (start a new one or resume the active one).
  await page.goto('/today')
  const startButton = page.getByRole('button', { name: /resume workout|start workout|start next session/i })
  await expect(async () => {
    await startButton.first().click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+/, { timeout: 2000 })
  }).toPass({ timeout: 20000 })

  const card = page.locator('[data-tour="live-onboarding"]')
  await expect(card).toBeVisible()
  await expect(card.getByText('Type your weight and reps')).toBeVisible()

  await card.getByRole('button', { name: 'Show me around' }).click()
  await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.driver-popover-title')).toContainText('Your current movement')

  await page.locator('.driver-popover-close-btn').click()
  await expect(page.locator('.driver-popover')).toHaveCount(0)

  await card.getByRole('button', { name: "Don't show again" }).click()
  await expect(card).toBeHidden({ timeout: 8000 })
  await page.reload()
  await expect(card).toHaveCount(0)

  // Force replay still works after the card has been dismissed.
  const url = new URL(page.url())
  url.searchParams.set('tour', 'live')
  await page.goto(url.toString())

  await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.driver-popover-title')).toContainText('Your current movement')

  // Advancing reaches the weight-logging step.
  await page.locator('.driver-popover-next-btn').click()
  await expect(page.locator('.driver-popover-title')).toContainText('Log the weight')
})

async function setLiveOnboardingDismissed(value: boolean) {
  const { supabaseUrl, anonKey } = getSupabaseTestEnv()
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const { error: authError } = await client.auth.signInWithPassword(DEMO_USER)
  if (authError) throw new Error(`Unable to sign in demo user for live onboarding setup: ${authError.message}`)

  const { data, error: userError } = await client.auth.getUser()
  if (userError) throw new Error(`Unable to read demo user for live onboarding setup: ${userError.message}`)
  if (!data.user) throw new Error('Unable to read demo user for live onboarding setup: no user returned')

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
    throw new Error('Missing SUPABASE_URL/SUPABASE_ANON_KEY for live onboarding e2e setup.')
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
