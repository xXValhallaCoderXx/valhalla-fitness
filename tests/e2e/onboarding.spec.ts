import { expect, test } from '@playwright/test'
import { login } from './support/auth'

// A genuinely-new demo account (active onboarding, all steps empty) seeded by `pnpm demo:seed`.
const DEMO_NEW = { email: 'demo.new@sheetless.local', password: 'DemoPass123!' }

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
  await page.addInitScript(() => window.localStorage.setItem('sheetless.onboardingTourAutorun', '1'))
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

test('"Skip for now" hides the checklist and records a snooze', async ({ page }) => {
  // Suppress the auto-running tour so the checklist itself is interactable.
  await page.addInitScript(() => window.localStorage.setItem('sheetless.onboardingTourAutorun', '1'))
  await login(page, DEMO_NEW)
  await page.goto('/today')

  const card = page.locator('[data-tour="getting-started"]')
  await expect(card).toBeVisible()
  await expect(card.getByRole('button', { name: 'Choose a plan' })).toBeVisible()

  await expect(async () => {
    await card.getByRole('button', { name: 'Skip for now' }).click()
    await expect(card).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  const snoozeUntil = await page.evaluate(() => window.localStorage.getItem('sheetless.onboardingSnoozeUntil'))
  expect(Number(snoozeUntil)).toBeGreaterThan(Date.now())
})
