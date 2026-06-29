import { expect, test } from '@playwright/test'

test.describe('logged out marketing', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('renders the landing page and routes CTAs to auth', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/$/)
    await expect(
      page.getByRole('heading', { name: 'Keep the logic. Lose the spreadsheet.' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: "The old way worked. The upkeep didn't." }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Pick a plan. Log the session. Get the next call.' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Real plans. Clear rules.' })).toBeVisible()

    await expect(async () => {
      await page.goto('/')
      await page.getByRole('link', { name: 'Get started' }).first().click()
      await expect(page).toHaveURL(/\/auth/, { timeout: 1000 })
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })
  })

  test('the header theme toggle switches light/dark', async ({ page }) => {
    await page.goto('/')

    await expect(async () => {
      const before = await page.evaluate(() =>
        document.documentElement.getAttribute('data-mantine-color-scheme'),
      )
      await page.getByRole('button', { name: /Switch to (dark|light) mode/ }).click()
      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.getAttribute('data-mantine-color-scheme')),
        )
        .not.toBe(before)
    }).toPass({ timeout: 15000 })
  })

  test('the Focus Mode demo logs sets interactively', async ({ page }) => {
    await page.goto('/')

    // The demo starts with set 1 pre-logged.
    await expect(page.getByText('1 of 5 sets')).toBeVisible()

    // Tapping the next set's complete toggle advances the progress (retry past the
    // SSR hydration race where early clicks no-op).
    await expect(async () => {
      await page.getByRole('button', { name: 'Toggle set 2 complete' }).click()
      await expect(page.getByText('2 of 5 sets')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })
  })
})

// Reuses the authenticated session from auth.setup.ts.
test('authenticated visitors skip marketing', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/today/, { timeout: 15000 })
})
