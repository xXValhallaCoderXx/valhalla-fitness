import { execFileSync } from 'node:child_process'
import { expect, test, type Request } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { buildAdHocMovementSlot, buildAdHocSnapshot } from '@sheetless/domain/session/ad-hoc'
import type { Database, Json } from '@sheetless/domain/shared/types/database'
import { login } from './support/auth'

test.use({ storageState: { cookies: [], origins: [] } })

function setRequest(request: Request): Record<string, unknown> | null {
  if (request.method() !== 'POST') return null
  const fields = request.postDataJSON()?.t?.p?.v?.[0]?.p
  if (!fields?.k?.includes('actualLoad') || !fields.k.includes('exerciseLogId')) return null
  return Object.fromEntries(fields.k.map((key: string, index: number) => [key, fields.v[index]?.s]))
}

for (const scenario of ['failed-correction', 'lost-response-correction', 'lost-response-exact'] as const) {
  test(`Focus ${scenario}: retains intended values and scopes RIR by exercise`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Focus currently lives on mobile web')
    test.setTimeout(90000)
    const local = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
      cwd: '../..', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }))
    if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(local.API_URL)) throw new Error('Local Supabase required')
    const authOptions = { auth: { persistSession: false, autoRefreshToken: false } }
    const admin = createClient<Database>(local.API_URL, local.SERVICE_ROLE_KEY, authOptions)
    const email = `focus-recovery-${crypto.randomUUID()}@example.test`
    const password = crypto.randomUUID() + 'aA1!'
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error || !created.data.user) throw created.error ?? new Error('Missing fixture user')
    const userId = created.data.user.id
    const attempts: Record<string, unknown>[] = []
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    try {
      const profile = await admin.from('profiles').insert({
        id: userId, email, units: 'kg', rounding: 2.5, auto_start_timer: false,
        onboarding_completed: true, live_onboarding_dismissed: true,
        post_workout_feedback_dismissed: true,
      })
      if (profile.error) throw profile.error
      const client = createClient<Database>(local.API_URL, local.ANON_KEY, authOptions)
      const auth = await client.auth.signInWithPassword({ email, password })
      if (auth.error) throw auth.error
      const scheduledDate = new Date().toISOString().slice(0, 10)
      const snapshot = buildAdHocSnapshot({
        title: 'Focus recovery', scheduledDate, timeZone: 'UTC', units: 'kg', rounding: 2.5,
        movements: [['squat', 'Squat'], ['bench_press', 'Bench Press']].map(([id, name], index) =>
          buildAdHocMovementSlot({ slotId: `ad-hoc:${id}:1`, movementId: id, movementName: name,
            role: 'main', orderIndex: index, setCount: 3 })),
      })
      const started = await client.rpc('start_ad_hoc_session_v2', {
        p_client_mutation_id: crypto.randomUUID(), p_scheduled_date: scheduledDate,
        p_prescription_snapshot: snapshot as unknown as Json,
      })
      if (started.error) throw started.error
      const sessionId = started.data
      const exercises = await admin.from('exercise_logs').select('id, performed_movement_id')
        .eq('session_id', sessionId).eq('user_id', userId)
      if (exercises.error) throw exercises.error
      const squatId = exercises.data.find((item) => item.performed_movement_id === 'squat')!.id
      const savedSet = async () => {
        const result = await admin.from('set_logs').select('actual_load, actual_reps, actual_rir, completed, client_mutation_id')
          .eq('exercise_log_id', squatId).eq('user_id', userId).eq('set_index', 1).single()
        if (result.error) throw result.error
        return result.data
      }
      await login(page, { email, password })
      await page.goto(`/sessions/${sessionId}`)
      const focus = page.getByTestId('focus-view')
      if (!(await focus.isVisible())) await page.getByTestId('enter-focus').click()
      await expect(focus).toBeVisible()

      // A's suggested effort must not silently select B's second set.
      await expect(async () => {
        expect(pageErrors).toEqual([])
        const rir = page.getByRole('button', { name: '2 — two more reps', exact: true })
        await rir.click()
        await expect(rir).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 })
      }).toPass({ timeout: 15000 })
      await page.getByTestId('focus-next-exercise').click()
      await expect(page.getByRole('heading', { name: 'Bench Press', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Set 2', exact: true }).click()
      await expect(page.getByRole('button', { name: '2 — two more reps', exact: true })).toHaveAttribute('aria-pressed', 'false')
      await page.getByTestId('focus-prev-exercise').click()
      await page.getByRole('button', { name: 'Set 1', exact: true }).click()

      await page.route('**/_serverFn/**', async (route) => {
        const input = setRequest(route.request())
        if (input?.sessionId === sessionId && input.exerciseLogId === squatId) {
          attempts.push(input)
          if (attempts.length === 1) {
            if (scenario !== 'failed-correction') {
              await route.fetch()
              await expect.poll(savedSet).toMatchObject({ actual_load: 80, completed: true })
            }
            return route.abort('failed')
          }
        }
        await route.continue()
      })
      const weight = page.getByLabel('Weight', { exact: true })
      const reps = page.getByLabel('Reps', { exact: true })
      await weight.fill('80')
      await reps.fill('5')
      await page.getByRole('button', { name: '2 — two more reps', exact: true }).click()
      await page.getByTestId('focus-log-set').click()
      await expect(page.getByTestId('focus-log-set')).toHaveText('Retry save')
      await expect(page.getByTestId('focus-finish')).toBeDisabled()
      const corrected = scenario !== 'lost-response-exact'
      if (corrected) {
        await weight.fill('82.5')
        await reps.fill('6')
        await page.getByRole('button', { name: '1 — maybe one more rep', exact: true }).click()
      }
      await page.getByTestId('focus-log-set').click()
      await expect.poll(savedSet).toMatchObject({
        actual_load: corrected ? 82.5 : 80, actual_reps: corrected ? 6 : 5,
        actual_rir: corrected ? 1 : 2, completed: true,
      })
      await expect(page.getByTestId('focus-log-set')).toHaveText('Update set')
      await expect(page.getByTestId('focus-finish')).toBeEnabled()
      expect(attempts).toHaveLength(2)
      if (corrected) expect(attempts[1].clientMutationId).not.toBe(attempts[0].clientMutationId)
      else expect(attempts[1].clientMutationId).toBe(attempts[0].clientMutationId)
      await expect(weight).toHaveValue(corrected ? '82.5' : '80')
      await page.screenshot({ path: testInfo.outputPath(`${scenario}.png`), fullPage: true })
      await testInfo.attach('set-receipts', {
        body: JSON.stringify({ attempts, saved: await savedSet() }, null, 2), contentType: 'application/json',
      })
    } finally {
      await testInfo.attach('page-errors', { body: JSON.stringify(pageErrors), contentType: 'application/json' })
      const deleted = await admin.auth.admin.deleteUser(userId)
      expect(deleted.error).toBeNull()
    }
  })
}
