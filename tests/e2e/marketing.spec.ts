import { expect, test } from '@playwright/test'

test.describe('logged out marketing', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('renders the landing page and routes CTAs to auth', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Stop guessing. Get stronger.' })).toBeVisible()

    await expect(async () => {
      await page.goto('/')
      await page.getByRole('link', { name: 'Get started' }).first().click()
      await expect(page).toHaveURL(/\/auth/, { timeout: 1000 })
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })
  })
})

// Reuses the authenticated session from auth.setup.ts.
test('authenticated visitors skip marketing', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/today/, { timeout: 15000 })
})
