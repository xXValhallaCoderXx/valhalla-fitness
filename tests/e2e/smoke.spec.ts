import { expect, test } from '@playwright/test'

test('auth screen renders', async ({ page }) => {
  await page.goto('/auth')
  await expect(page.getByRole('heading', { name: 'Mobile Strength Tracker' })).toBeVisible()
  await expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
})
