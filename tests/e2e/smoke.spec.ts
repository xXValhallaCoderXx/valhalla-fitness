import { expect, test } from '@playwright/test'

test.describe('logged out', () => {
  // The auth screen must be checked without the shared authenticated session.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('auth screen renders', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByText('Sign in to your Sheetless account.')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /create an account/i })).toBeVisible()
  })
})

// Reuses the authenticated session from auth.setup.ts — no login UI needed.
test('authenticated app shell loads', async ({ page }) => {
  await page.goto('/today')
  await expect(page).toHaveURL(/\/today/)
  await expect(page.getByText('Sheetless').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Your Plan' }).first()).toBeVisible()
})
