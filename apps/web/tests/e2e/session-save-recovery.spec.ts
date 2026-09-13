import { execFileSync } from 'node:child_process'
import { expect, test, type Page, type Request } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@sheetless/domain/shared/types/database'
import { login } from './support/auth'

test.use({ storageState: { cookies: [], origins: [] } })

// Server functions serialize named fields with Seroval; inspect only set-save inputs.
function setRequest(request: Request): Record<string, unknown> | null {
  if (request.method() !== 'POST') return null
  const body = request.postDataJSON()
  const fields = body?.t?.p?.v?.[0]?.p
  if (!fields?.k?.includes('actualLoad') || !fields.k.includes('exerciseLogId')) return null
  return Object.fromEntries(fields.k.map((key: string, index: number) => [key, fields.v[index]?.s]))
}

async function overview(page: Page) {
  const focus = page.getByTestId('focus-view')
  if (await focus.isVisible()) await page.getByTestId('focus-overview').click()
  await expect(page.getByTestId('add-exercise')).toBeVisible()
}

async function addExercise(page: Page, name: string) {
  await overview(page)
  await page.getByTestId('add-exercise').click()
  const dialog = page.getByRole('dialog', { name: 'Add exercise', exact: true })
  await dialog.getByPlaceholder('Search exercises').fill(name)
  await dialog.getByRole('button', { name: new RegExp(`^${name} `) }).click()
  await dialog.getByTestId('confirm-add-exercise').click()
  await expect(dialog).toBeHidden()
  await overview(page)
}

async function selectExercise(page: Page, name: string) {
  const card = page.getByTestId('movement-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  })
  const article = card.locator('article[data-tour="live-movement"]')
  if (!(await article.isVisible())) await card.getByRole('button', { name: new RegExp(`^\\d+\\s*${name} `) }).click()
  await expect(article).toBeVisible()
  return article.locator('div[role="button"]').first()
}

test('a failed set survives another save and navigation, then retries its original intent', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const local = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    cwd: '../..', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }))
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(local.API_URL)) throw new Error('Local Supabase required')
  const admin = createClient<Database>(local.API_URL, local.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const email = `save-recovery-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID() + 'aA1!'
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) throw created.error ?? new Error('Missing test user')
  const userId = created.data.user.id
  const attempts: Record<string, unknown>[] = []
  try {
    const profile = await admin.from('profiles').insert({
      id: userId, email, units: 'kg', rounding: 2.5, auto_start_timer: false,
      onboarding_completed: true, live_onboarding_dismissed: true,
      post_workout_feedback_dismissed: true,
    })
    if (profile.error) throw profile.error
    await login(page, { email, password })
    await page.getByRole('button', { name: /start a blank workout/i }).click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/)
    await expect(page.getByRole('heading', { name: 'No exercises yet' })).toBeVisible()
    const sessionId = new URL(page.url()).pathname.split('/').at(-1)!
    await addExercise(page, 'Squat')
    await addExercise(page, 'Bench Press')

    const exercises = await admin.from('exercise_logs').select('id, performed_movement_id')
      .eq('user_id', userId).eq('session_id', sessionId)
    if (exercises.error) throw exercises.error
    const squatId = exercises.data.find((exercise) => exercise.performed_movement_id === 'squat')!.id
    const benchId = exercises.data.find((exercise) => exercise.performed_movement_id === 'bench_press')!.id
    const savedSet = async (exerciseId: string) => {
      const result = await admin.from('set_logs')
        .select('actual_load, actual_reps, actual_rir, completed, client_mutation_id')
        .eq('user_id', userId).eq('exercise_log_id', exerciseId).eq('set_index', 1).single()
      if (result.error) throw result.error
      return result.data
    }
    await page.route('**/_serverFn/**', async (route) => {
      const input = setRequest(route.request())
      if (input?.sessionId === sessionId && input.exerciseLogId === squatId) {
        attempts.push(input)
        if (attempts.length === 1) return route.abort('failed')
      }
      await route.continue()
    })

    let squat = await selectExercise(page, 'Squat')
    await squat.locator('input[type="number"]').nth(0).fill('123.5')
    await squat.locator('input[type="number"]').nth(1).fill('7')
    await squat.getByRole('button', { name: 'Reps in reserve (RIR)', exact: true }).click()
    await squat.getByRole('button', { name: '1 — maybe one more rep', exact: true }).click()
    await squat.getByRole('button', { name: 'Complete set 1', exact: true }).click()
    await expect(squat.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible()
    const finish = page.locator('[data-tour="live-finish"]')
    await expect(finish).toBeDisabled()
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toMatchObject({ actualLoad: 123.5, actualReps: 7, actualRir: 1 })
    expect((await savedSet(squatId)).completed).toBe(false)

    const bench = await selectExercise(page, 'Bench Press')
    await bench.locator('input[type="number"]').nth(0).fill('42.5')
    await bench.locator('input[type="number"]').nth(1).fill('8')
    await bench.getByRole('button', { name: 'Complete set 1', exact: true }).click()
    await expect.poll(() => savedSet(benchId)).toMatchObject({ actual_load: 42.5, actual_reps: 8, completed: true })
    await expect(bench.getByRole('button', { name: 'Edit set 1', exact: true })).toBeEnabled()
    await expect(finish).toBeDisabled()

    // Rename returns a complete server snapshot; switching exercises unmounts the failed row.
    await page.getByRole('button', { name: 'Rename workout', exact: true }).click()
    await page.getByPlaceholder('e.g. Push day').fill('Recovery regression')
    await expect(page.getByRole('button', { name: 'Save name', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Save name', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Recovery regression', exact: true })).toBeVisible()
    squat = await selectExercise(page, 'Squat')
    await expect(squat.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible()
    await expect(squat.locator('input[type="number"]').nth(0)).toHaveValue('123.5')
    await expect(squat.locator('input[type="number"]').nth(1)).toHaveValue('7')
    await expect(squat.getByRole('button', { name: 'Reps in reserve (RIR)', exact: true })).toHaveText('1')

    if (testInfo.project.name === 'mobile-chrome') {
      await page.getByTestId('enter-focus').click()
      await expect(page.getByTestId('focus-view')).toBeVisible()
      await expect(page.getByTestId('focus-finish')).toBeDisabled()
      await overview(page)
    }
    // SPA navigation retains account-scoped in-memory edits without depending on mounted rows.
    await page.getByTestId('nested-back').click()
    await expect(page).toHaveURL(/\/today$/)
    await page.getByRole('button', { name: /resume workout/i }).click()
    await expect(page).toHaveURL(new RegExp(`/sessions/${sessionId}$`))
    await overview(page)
    squat = await selectExercise(page, 'Squat')
    const retry = squat.getByRole('button', { name: 'Retry save', exact: true })
    await expect(retry).toBeVisible()
    await expect(squat.locator('input[type="number"]').nth(0)).toHaveValue('123.5')
    await expect(squat.locator('input[type="number"]').nth(1)).toHaveValue('7')
    await expect(finish).toBeDisabled()
    await page.screenshot({ path: testInfo.outputPath('failed-set-retained.png'), fullPage: true })

    await retry.click()
    await expect.poll(() => savedSet(squatId)).toMatchObject({
      actual_load: 123.5, actual_reps: 7, actual_rir: 1, completed: true,
      client_mutation_id: attempts[0].clientMutationId,
    })
    expect(attempts).toHaveLength(2)
    expect(attempts[1].clientMutationId).toBe(attempts[0].clientMutationId)
    await expect(retry).toHaveCount(0)
    await expect(finish).toBeEnabled()
    await page.screenshot({ path: testInfo.outputPath('retry-saved-finish-enabled.png'), fullPage: true })
    await testInfo.attach('retry-receipt', {
      body: JSON.stringify({ attempts, savedA: await savedSet(squatId), savedB: await savedSet(benchId) }, null, 2),
      contentType: 'application/json',
    })
    await finish.click()
    const confirmation = page.getByTestId('finish-session-modal')
    await expect(confirmation).toBeVisible()
    await confirmation.getByRole('button', { name: 'Finish workout', exact: true }).click()
    await expect(page).toHaveURL(/\/summary$/, { timeout: 20000 })
    const completed = await admin.from('workout_sessions').select('status').eq('id', sessionId).single()
    if (completed.error) throw completed.error
    expect(completed.data.status).toBe('completed')
  } finally {
    const deleted = await admin.auth.admin.deleteUser(userId)
    expect(deleted.error).toBeNull()
  }
})
