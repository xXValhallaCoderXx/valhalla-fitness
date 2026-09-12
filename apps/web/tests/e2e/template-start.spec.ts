import { expect, test } from '@playwright/test'
import { login } from './support/auth'
import { getUserId } from './support/profile'
import { advanceSetupStep, setupStepRail } from './support/setup-wizard'

// A genuinely-new demo account without strength estimates (seeded by `pnpm demo:seed`).
const DEMO_NEW = { email: 'demo.new@sheetless.local', password: 'DemoPass123!' }

/**
 * Programme setup is a four-step wizard. Uses the authenticated demo session from auth.setup.ts,
 * so it needs Docker + local Supabase running and a seeded demo user (`pnpm exec supabase start`
 * && `pnpm demo:seed`). `bromley-bullmastiff` is the phased "Old School Wave Powerbuilding"
 * template. Assertions target the main column + header so they hold on both e2e projects.
 */

test('phased setup: steps, blocks, phase tabs, and how-it-works', async ({ page }) => {
  await page.goto('/templates/bromley-bullmastiff/start')

  // Step 1 leads with the numbers every load is derived from.
  await expect(setupStepRail(page)).toBeVisible({ timeout: 15000 })

  // "How it works" is header chrome and stays reachable from every step.
  await expect(async () => {
    await page.getByRole('button', { name: 'How it works' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })
  await expect(page.getByRole('dialog').getByText('What Sheetless regulates')).toBeVisible()
  await page.keyboard.press('Escape')

  // The block timeline and the week plan it drives both live in step 2.
  await advanceSetupStep(page, /Equipment & swaps/)
  await expect(page.getByText('Programme blocks')).toBeVisible({ timeout: 15000 })

  // Switching to the Peak phase loads its week plan and flags changed rows with an "Updated" chip.
  await expect(async () => {
    await page.getByRole('button', { name: 'Peak', exact: true }).click()
    await expect(page.getByText('Updated').first()).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })
})

test('free-weights-only mode previews and applies phased replacements', async ({ page }) => {
  await page.goto('/templates/bromley-bullmastiff/start')
  await expect(setupStepRail(page)).toBeVisible({ timeout: 15000 })
  await advanceSetupStep(page, /Equipment & swaps/)

  await expect(async () => {
    await page.getByText('Free weights only', { exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Use free weights only?' })).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })

  const dialog = page.getByRole('dialog', { name: 'Use free weights only?' })
  await expect(dialog.getByText('Base phase', { exact: true }).first()).toBeVisible()
  await expect(dialog.getByText('Peak phase', { exact: true }).first()).toBeVisible()
  await expect(dialog.getByText('Leg Press', { exact: true }).first()).toBeVisible()
  await expect(dialog.getByText('Goblet Squat', { exact: true }).first()).toBeVisible()

  await dialog.getByRole('button', { name: 'Use free weights only', exact: true }).click()
  await expect(page.getByText('Goblet Squat', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Free weights only', { exact: true }).last()).toBeVisible()

  await page.getByText('All equipment', { exact: true }).click()
  await expect(page.getByText('Leg Press', { exact: true }).first()).toBeVisible()
})

/**
 * Without saved estimates the wizard stops at step 1 and says which lifts are missing.
 *
 * This used to let you walk all the way to a disabled Start and explain itself in a popover; the
 * blocker now names the lifts at the step that can actually fix them.
 */
test('missing strength estimates block step 1 and name the lifts', async ({ page }) => {
  // Suppress the Today-page auto tour (user-scoped key) so login lands cleanly.
  await page.addInitScript(
    (id) => window.localStorage.setItem(`sheetless.onboardingTourAutorun.${id}`, '1'),
    await getUserId(DEMO_NEW),
  )
  await login(page, DEMO_NEW)
  await page.goto('/templates/bromley-bullmastiff/start')

  await expect(setupStepRail(page)).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/Missing strength estimates? for/)).toBeVisible()
  await expect(page.getByText('Squat', { exact: false }).first()).toBeVisible()

  // The route forward is closed while the blocker stands, at either width.
  await expect(
    page.getByRole('button', { name: /^Continue/ }).filter({ visible: true }).first(),
  ).toBeDisabled()
})
