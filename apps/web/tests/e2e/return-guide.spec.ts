import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@sheetless/domain/shared/types/database'
import type { TemplateDefinition } from '@sheetless/domain/program/types'
import { login } from './support/auth'

test.use({ storageState: { cookies: [], origins: [] } })

test('return preview, explicit reset, editing and review persist across reloads', async ({
  page,
}, testInfo) => {
  test.setTimeout(150000)
  page.on('pageerror', (error) => console.error('Browser error:', error.message))
  const local = JSON.parse(
    execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
      cwd: '../..',
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  )
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(local.API_URL))
    throw new Error('Local Supabase required')
  const admin = createClient<Database>(local.API_URL, local.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const email = `return-browser-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID() + 'aA1!'
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) throw created.error ?? new Error('Missing test user')
  const user = created.data.user
  try {
    const profile = await admin
      .from('profiles')
      .insert({ id: user.id, email, onboarding_completed: true, live_onboarding_dismissed: true })
    if (profile.error) throw profile.error
    const version = await admin
      .from('program_template_versions')
      .select('*')
      .eq('template_id', 'generic_alternating_5x5_lp')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (version.error) throw version.error
    const definition = version.data.definition as unknown as TemplateDefinition
    const program = await admin
      .from('program_instances')
      .insert({
        user_id: user.id,
        template_id: definition.id,
        template_version_id: version.data.id,
        title: 'Return browser test',
        status: 'active',
        start_date: '2026-09-06',
        units: 'kg',
        rounding: 2.5,
        current_week_index: 0,
      })
      .select('id')
      .single()
    if (program.error) throw program.error
    const states = await admin.from('program_state_values').insert(
      definition.requiredState.map((state) => ({
        user_id: user.id,
        program_instance_id: program.data.id,
        key: state.key,
        movement_id: state.movementId,
        state_type: state.type,
        value: 100,
        unit: 'kg',
      })),
    )
    if (states.error) throw states.error
    const supabase = createClient<Database>(local.API_URL, local.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const signed = await supabase.auth.signInWithPassword({ email, password })
    if (signed.error) throw signed.error
    const currentLoads = async () => {
      const result = await supabase
        .from('program_state_values')
        .select('value')
        .eq('program_instance_id', program.data.id)
      if (result.error) throw result.error
      return result.data.map((state) => state.value)
    }
    await login(page, { email, password })
    await page.goto('/program')
    const dialog = page.getByRole('dialog')
    const openGuide = async (label: string) => {
      await expect(async () => {
        if (!(await dialog.isVisible()))
          await page.getByRole('button', { name: label, exact: true }).click()
        await expect(dialog).toBeVisible({ timeout: 2000 })
      }).toPass({ timeout: 20000 })
    }
    await openGuide('Return after a break')
    await expect(dialog.getByText('Your main lifts', { exact: true })).toBeVisible({
      timeout: 15000,
    })
    await expect(
      dialog.getByLabel('Qualifying workouts', { exact: true }).first(),
    ).not.toBeVisible()
    const slider = dialog.getByRole('slider', { name: 'Starting weight' })
    await expect(slider).toHaveAttribute('aria-valuenow', '80')
    await slider.focus()
    await slider.press('ArrowRight')
    await expect(slider).toHaveAttribute('aria-valuenow', '81')
    await expect(dialog.getByText('Starting weight · 81%', { exact: true })).toBeVisible()
    await slider.press('ArrowLeft')
    await expect(dialog.getByText('The next couple of weeks', { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('return-overview.png'), fullPage: true })
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    expect((await currentLoads()).every((load) => load === 100)).toBe(true)
    await openGuide('Return after a break')
    await dialog.getByText('Fine-tune loads, sets and progression', { exact: true }).click()
    await expect(dialog.getByLabel('Qualifying workouts', { exact: true })).toHaveCount(2)
    for (const field of await dialog.getByLabel('Qualifying workouts', { exact: true }).all())
      await field.fill('1')
    await dialog.getByText(/Choose a lighter starting point/).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('return-preview.png'), fullPage: true })
    await dialog.getByRole('button', { name: 'Start my return' }).click()
    await expect(dialog).not.toBeVisible()
    expect((await currentLoads()).every((load) => load === 80)).toBe(true)
    await page.reload()
    await openGuide('Review return guide')
    await expect(dialog.getByRole('slider', { name: 'Starting weight' })).not.toBeVisible()
    await dialog.getByText('Fine-tune loads, sets and progression', { exact: true }).click()
    await expect(dialog.getByText(/original reduction is never applied again/)).toBeVisible()
    await dialog.getByLabel('Minimum repetitions in reserve').fill('4')
    await dialog.getByRole('button', { name: 'Save guide changes' }).click()
    await expect(dialog).not.toBeVisible()
    expect((await currentLoads()).every((load) => load === 80)).toBe(true)
    for (let index = 0; index < 2; index++) {
      await page.goto('/today')
      await expect(async () => {
        await page
          .getByRole('button', { name: /^(Start workout|Start next session)$/ })
          .first()
          .click()
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 2000 })
      }).toPass({ timeout: 20000 })
      await expect(
        page
          .getByText(/Return stage/)
          .and(page.locator(':visible'))
          .first(),
      ).toBeVisible()
      if (testInfo.project.name === 'mobile-chrome') {
        await expect(page.getByRole('spinbutton', { name: 'Actual reps in reserve' })).toHaveValue(
          '',
        )
        await page.getByRole('spinbutton', { name: 'Actual reps in reserve' }).fill('4')
      }
      const sessionId = new URL(page.url()).pathname.split('/').at(-1)!
      const exercises = await supabase
        .from('exercise_logs')
        .select('id')
        .eq('session_id', sessionId)
        .order('order_index')
        .limit(1)
        .single()
      if (exercises.error) throw exercises.error
      const target = await supabase
        .from('set_logs')
        .select('*')
        .eq('exercise_log_id', exercises.data.id)
        .order('set_index')
        .limit(1)
        .single()
      if (target.error) throw target.error
      const logged = await supabase.rpc('upsert_session_set_v2', {
        p_session_id: sessionId,
        p_exercise_log_id: exercises.data.id,
        p_set_index: target.data.set_index,
        p_actual_load: target.data.target_load,
        p_actual_reps: target.data.target_reps ?? 5,
        p_actual_rir: 4,
        p_actual_rpe: null,
        p_completed: true,
        p_note: null,
        p_client_mutation_id: crypto.randomUUID(),
        p_expected_state_version: 0,
      })
      if (logged.error) throw logged.error
      const current = await supabase
        .from('program_instances')
        .select('state_version')
        .eq('id', program.data.id)
        .single()
      if (current.error) throw current.error
      const finished = await supabase.rpc('finish_session_v3', {
        p_session_id: sessionId,
        p_request_id: crypto.randomUUID(),
        p_notes: null,
        p_session_rpe: null,
        p_reflection_win: null,
        p_reflection_improve: null,
        p_prs: [],
        p_decisions: [],
        p_expected_program_version: current.data.state_version,
        p_expected_session_version: 1,
      })
      if (finished.error) throw finished.error
    }
    await page.goto('/today')
    await expect(page.getByText('Review your return', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText('Review your return', { exact: true })).toBeVisible()
    await openGuide('Review return guide')
    await dialog.getByRole('button', { name: 'Normal sets at current weights' }).click()
    await expect(dialog).not.toBeVisible()
    expect((await currentLoads()).every((load) => load === 80)).toBe(true)
    await expect(page.getByText('Review your return', { exact: true })).not.toBeVisible()
  } finally {
    const deleted = await admin.auth.admin.deleteUser(user.id)
    expect(deleted.error).toBeNull()
  }
})
