import { expect, test } from '@playwright/test'
import { login } from './support/auth'
import { getUserId, setOnboardingCompleted } from './support/profile'

// A genuinely-new demo account (active onboarding, all steps empty) seeded by `pnpm demo:seed`.
const DEMO_NEW = { email: 'demo.new@sheetless.local', password: 'DemoPass123!' }
// Onboarding account with every strength estimate already set (not used by other specs, so the
// estimate nudges below don't pollute shared state).
const DEMO_ESTIMATES = { email: 'demo.estimates@sheetless.local', password: 'DemoPass123!' }
// Plan + estimates done but no completed workout — dedicated to the dismiss test below so the
// server-flag mutation can't pollute the other onboarding accounts.
const DEMO_STARTED = { email: 'demo.started@sheetless.local', password: 'DemoPass123!' }

/** Pre-seed the user-scoped tour-autorun key so the auto tour doesn't cover the checklist. */
async function suppressAutoTour(page: import('@playwright/test').Page, userId: string) {
  await page.addInitScript(
    (id) => window.localStorage.setItem(`sheetless.onboardingTourAutorun.${id}`, '1'),
    userId,
  )
}

// Uses the shared authenticated session; `?onboarding=force` shows the onboarding
// UI regardless of the account's saved flag (so it's deterministic to test).
test('onboarding checklist renders and the guided tour launches', async ({ page }) => {
  await page.goto('/today?onboarding=force')

  const card = page.locator('[data-tour="getting-started"]')
  await expect(card).toBeVisible()
  await expect(card.getByText('Choose a training plan')).toBeVisible()

  // Launch the tour — retry through hydration.
  await expect(async () => {
    await card.getByRole('button', { name: 'Take a quick tour' }).click()
    await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  await expect(page.locator('.driver-popover-title')).toContainText('Welcome to Sheetless')

  // Stepping forward advances to the Today nav spotlight (mnav-* under mobile-chrome).
  await page.locator('.driver-popover-next-btn').click()
  await expect(page.locator('.driver-popover-title')).toContainText('Today')
})

test('the guided tour can be closed (skip path) without errors', async ({ page }) => {
  await page.goto('/today?onboarding=force')
  const card = page.locator('[data-tour="getting-started"]')

  await expect(async () => {
    await card.getByRole('button', { name: 'Take a quick tour' }).click()
    await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  await page.locator('.driver-popover-close-btn').click()
  await expect(page.locator('.driver-popover')).toHaveCount(0)
})

test('"Choose a plan" deep-links into Find-my-plan', async ({ page }) => {
  await page.goto('/templates?find=1')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 10000 })
  await expect(dialog.getByText('Find my plan')).toBeVisible()
  // The param is cleared so refresh/back doesn't re-pop the modal.
  await expect(page).not.toHaveURL(/find=/)
})

test('"Set estimates" deep-links to estimates and runs the coach-marks', async ({ page }) => {
  await page.goto('/settings?focus=estimates')

  await expect(page.locator('#programme-loads')).toBeInViewport({ timeout: 10000 })
  await expect(page).not.toHaveURL(/focus=estimates/)

  // The walkthrough spotlights the inputs, then the 1RM calculator.
  await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.driver-popover-title')).toContainText('Enter your estimates')
  await page.locator('.driver-popover-next-btn').click()
  await expect(page.locator('.driver-popover-title')).toContainText("Don't know your max?")
})

test('clicking "Set estimates" from the checklist (client nav) runs the coach-marks', async ({ page }) => {
  await suppressAutoTour(page, await getUserId(DEMO_NEW))
  await login(page, DEMO_NEW)
  await page.goto('/today')

  const card = page.locator('[data-tour="getting-started"]')
  await expect(card).toBeVisible()
  await expect(async () => {
    await card.getByRole('button', { name: 'Set estimates' }).click()
    await expect(page).toHaveURL(/\/settings/, { timeout: 2000 })
  }).toPass({ timeout: 15000 })

  await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.driver-popover-title')).toContainText('Enter your estimates')
})

test('"Don\'t show again" confirms before exiting onboarding, then persists', async ({ page }) => {
  // Mutates the account's server flag, so run on a single project — the desktop and mobile
  // projects would otherwise race each other through the same account.
  test.skip((page.viewportSize()?.width ?? 0) < 768, 'server-flag mutation: desktop project only')

  const userId = await setOnboardingCompleted(DEMO_STARTED, false)
  await suppressAutoTour(page, userId)
  await login(page, DEMO_STARTED)
  await page.goto('/today')

  const card = page.locator('[data-tour="getting-started"]')
  await expect(card).toBeVisible()

  const dialog = page.getByRole('dialog', { name: 'Exit onboarding?' })

  // Cancelling the confirmation keeps the checklist.
  await expect(async () => {
    await card.getByRole('button', { name: "Don't show again" }).click()
    await expect(dialog).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await expect(dialog.getByText('we recommend completing these steps')).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await expect(card).toBeVisible()

  // Confirming completes onboarding server-side and the checklist stays gone after reload.
  await card.getByRole('button', { name: "Don't show again" }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Exit onboarding' }).click()
  await expect(card).toBeHidden({ timeout: 10000 })

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 10000 })
  await expect(card).toHaveCount(0)

  // Restore the seeded state for other runs.
  await setOnboardingCompleted(DEMO_STARTED, false)
})

test('saving estimates after the "Set estimates" deep-link redirects to Today', async ({ page }) => {
  // Saving estimates ends the account's "needs estimates" state, so run on a single project —
  // the desktop and mobile projects would otherwise race each other through the same account.
  test.skip((page.viewportSize()?.width ?? 0) < 768, 'server-flag mutation: desktop project only')

  await login(page, DEMO_ESTIMATES)
  await page.goto('/settings?focus=estimates')

  // Dismiss the estimates coach-marks so we can drive the form.
  await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 8000 })
  await page.locator('.driver-popover-close-btn').click()
  await expect(page.locator('.driver-popover')).toHaveCount(0)

  // Nudge an estimate to enable Save, then save. Arrived via ?focus=estimates while onboarding with
  // every main-lift estimate set → redirected back to Today.
  const first = page.locator('[data-tour="settings-estimates"] input[type="number"]').first()
  await expect(async () => {
    await first.fill('111')
    await expect(first).toHaveValue('111', { timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(/\/today/, { timeout: 10000 })
})
