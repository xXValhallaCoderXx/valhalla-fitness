import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@sheetless/domain/shared/types/database'
import { login } from './support/auth'

test.use({ storageState: { cookies: [], origins: [] } })

function recoveryAction(page: Page, name: string) {
  const main = page.getByRole('main')
  return main.getByRole('button', { name, exact: true })
    .or(main.getByRole('link', { name, exact: true })).first()
}

async function expectSignIn(page: Page) {
  await expect(page).toHaveURL(/\/auth$/)
  await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible()
}

test('empty and interrupted auth callbacks offer a fresh sign-in', async ({ page }, testInfo) => {
  const probeCode = `entry-recovery-${crypto.randomUUID()}`
  let aborted = 0
  await page.route('**/_serverFn/**', async (route) => {
    const request = route.request()
    if (request.method() === 'POST' && request.postData()?.includes(probeCode)) {
      aborted++
      return route.abort('failed')
    }
    await route.continue()
  })
  for (const [name, path] of [
    ['empty', '/auth/callback'],
    ['interrupted', `/auth/callback?code=${probeCode}`],
  ]) {
    await page.goto(path)
    const back = recoveryAction(page, 'Back to sign in')
    await expect(back).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Completing sign in/i)).toHaveCount(0)
    if (name === 'interrupted') expect(aborted).toBe(1)
    await page.screenshot({ path: testInfo.outputPath(`${name}-callback-recovery.png`), fullPage: true })
    await back.click()
    await expectSignIn(page)
  }
})

test('signed-out settings provides a working sign-in action', async ({ page }, testInfo) => {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Sign in to edit settings', exact: true })).toBeVisible()
  const signIn = recoveryAction(page, 'Sign in')
  await expect(signIn).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('signed-out-settings.png'), fullPage: true })
  await signIn.click()
  await expectSignIn(page)
})

test('missing and invalid workout links return a useful 404 with an exit', async ({ page }, testInfo) => {
  test.setTimeout(90000)
  const local = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    cwd: '../..', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }))
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(local.API_URL)) throw new Error('Local Supabase required')
  const admin = createClient<Database>(local.API_URL, local.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const email = `entry-recovery-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID() + 'aA1!'
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) throw created.error ?? new Error('Missing test user')
  const userId = created.data.user.id
  try {
    const profile = await admin.from('profiles').insert({
      id: userId, email, onboarding_completed: true, live_onboarding_dismissed: true,
    })
    if (profile.error) throw profile.error
    await login(page, { email, password })
    const missingId = crypto.randomUUID()
    for (const [name, path] of [
      ['missing-workout', `/sessions/${missingId}`],
      ['missing-summary', `/sessions/${missingId}/summary`],
      ['invalid-workout', '/sessions/not-a-workout-id'],
    ]) {
      const response = await page.goto(path)
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { name: 'Workout unavailable', exact: true })).toBeVisible()
      await expect(page.getByRole('main')).not.toContainText(/PGRST\d+|JSON object requested|invalid input syntax|Internal Server Error|error_code/)
      const back = recoveryAction(page, 'Back to Today')
      await expect(back).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true })
      await back.click()
      await expect(page).toHaveURL(/\/today$/)
      await expect(page.getByRole('heading', { name: 'No active programme', exact: true })).toBeVisible()
    }
  } finally {
    const deleted = await admin.auth.admin.deleteUser(userId)
    expect(deleted.error).toBeNull()
  }
})
