import { expect, test } from '@playwright/test'
import { setLiveOnboardingDismissed } from './support/profile'

test.beforeEach(async () => {
  await setLiveOnboardingDismissed(false)
})

test('in-session onboarding card starts, dismisses, and replay still works', async ({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 768,
    'The Overview walkthrough is the desktop/overview experience; focus-mode.spec covers mobile onboarding.',
  )
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
