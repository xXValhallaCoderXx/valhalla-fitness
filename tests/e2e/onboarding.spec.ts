import { expect, test } from '@playwright/test'

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

  // Stepping forward advances to the Today nav spotlight.
  await page.locator('.driver-popover-next-btn').click()
  await expect(page.locator('.driver-popover-title')).toContainText('Today')
})
