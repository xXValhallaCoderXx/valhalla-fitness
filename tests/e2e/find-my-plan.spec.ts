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
  // Default answers (new lifter / 2–3 days / keep it simple) → the beginner plan, plus alternatives.
  await expect(dialog.getByText('We recommend')).toBeVisible()
  await expect(dialog.getByText('Beginner 5x5 Linear')).toBeVisible()
  await expect(dialog.getByText('Other good fits')).toBeVisible()

  // Changing answers updates the recommendation live.
  await dialog.getByText('Very experienced').click()
  await dialog.getByText('4+ days').click()
  await dialog.getByText('Muscle + strength').click()
  await expect(dialog.getByText('Old School Wave Powerbuilding')).toBeVisible()

  // Starting the recommended plan routes into its setup flow.
  await dialog.getByRole('button', { name: 'Start this plan' }).click()
  await expect(page).toHaveURL(/\/templates\/.+\/start/)
})

test('find my plan recommends a new gap-filling plan and starts it from the DB seed', async ({ page }) => {
  await page.goto('/templates')

  await expect(async () => {
    await page.getByRole('button', { name: 'Find my plan' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  const dialog = page.getByRole('dialog')
  // Beginner + 4+ days + keep it simple — previously fell back to the 3-day 5x5; now the new
  // four-day upper/lower split fills the gap.
  await dialog.getByText('4+ days').click()
  await expect(dialog.getByText('Beginner Upper/Lower')).toBeVisible()

  // Start it — proves the DB-seeded template + version load the setup screen end-to-end.
  await dialog.getByRole('button', { name: 'Start this plan' }).click()
  await expect(page).toHaveURL(/\/templates\/beginner_upper_lower_lp\/start/)
  await expect(page.getByRole('button', { name: 'Start programme' })).toBeVisible({ timeout: 10000 })
})
