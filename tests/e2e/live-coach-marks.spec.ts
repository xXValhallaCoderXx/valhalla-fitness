import { expect, test } from '@playwright/test'

// The in-session coach-marks auto-run once per device on a fresh workout. We suppress the
// natural autorun and force the walkthrough with `?tour=live` so the test is deterministic.
test('first-workout coach-marks run on the live session screen', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('sheetless.liveTourAutorun', '1'))

  // Get onto a live session (start a new one or resume the active one).
  await page.goto('/today')
  const startButton = page.getByRole('button', { name: /resume workout|start workout|start next session/i })
  await expect(async () => {
    await startButton.first().click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+/, { timeout: 2000 })
  }).toPass({ timeout: 20000 })

  // Force the in-session walkthrough on the session we landed on.
  const url = new URL(page.url())
  url.searchParams.set('tour', 'live')
  await page.goto(url.toString())

  await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.driver-popover-title')).toContainText('Your current movement')

  // Advancing reaches the weight-logging step.
  await page.locator('.driver-popover-next-btn').click()
  await expect(page.locator('.driver-popover-title')).toContainText('Log the weight')
})
