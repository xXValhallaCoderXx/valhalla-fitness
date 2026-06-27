import { expect, test } from '@playwright/test'

// Uses the shared authenticated session from auth.setup.ts.
test('find my plan recommends a plan and adapts to the answers', async ({ page }) => {
  await page.goto('/templates')

  // Open the finder — retry until React has hydrated and the click registers.
  await expect(async () => {
    await page.getByRole('button', { name: 'Find my plan' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  const dialog = page.getByRole('dialog')
  // Default answers (new lifter / 2–3 days / keep it simple) → the beginner plan.
  await expect(dialog.getByText('We recommend')).toBeVisible()
  await expect(dialog.getByText('Beginner 5x5 Linear')).toBeVisible()

  // Changing answers updates the recommendation live.
  await dialog.getByText('Very experienced').click()
  await dialog.getByText('4+ days').click()
  await dialog.getByText('Muscle + strength').click()
  await expect(dialog.getByText('Old School Wave Powerbuilding')).toBeVisible()

  // Starting the recommended plan routes into its setup flow.
  await dialog.getByRole('button', { name: 'Start this plan' }).click()
  await expect(page).toHaveURL(/\/templates\/.+\/start/)
})
