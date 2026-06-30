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

  test('the Focus Mode demo logs a set and advances', async ({ page }) => {
    await page.goto('/')

    // Set 1 is pre-logged, so the active set is set 2.
    await expect(page.getByText('Set 2 of 5')).toBeVisible()

    // Logging the set advances focus to the next one (retry past the SSR hydration
    // race where early clicks no-op).
    await expect(async () => {
      await page.getByRole('button', { name: 'Log set' }).click()
      await expect(page.getByText('Set 3 of 5')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })
  })

  test('the Focus Mode demo reveals the progression call when every set is logged', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Set 2 of 5')).toBeVisible()

    // Log sets 2, 3, 4 → land on the final set (retry past the SSR hydration race).
    for (const next of [3, 4, 5]) {
      await expect(async () => {
        await page.getByRole('button', { name: 'Log set' }).click()
        await expect(page.getByText(`Set ${next} of 5`)).toBeVisible({ timeout: 1000 })
      }).toPass({ timeout: 15000 })
    }

    // Two reps in reserve on the final set → Sheetless adds weight.
    await page.getByRole('button', { name: '2 — two more reps' }).click()
    await page.getByRole('button', { name: 'Log set' }).click()

    const sheet = page.getByRole('dialog', { name: 'Progression result' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText('Add weight')).toBeVisible()
    await expect(sheet.getByText('87.5 → 92.5 kg')).toBeVisible()

    // Every set is logged, so none is left as the faint "current" segment (all bars lit).
    await expect(page.locator('[aria-label="Set progress"] [aria-current="true"]')).toHaveCount(0)

    // "Run the demo again" resets to a fresh session.
    await page.getByRole('button', { name: 'Run the demo again' }).click()
    await expect(sheet).toBeHidden()
    await expect(page.getByText('Set 2 of 5')).toBeVisible()
  })

  test('the Find My Plan quiz opens and recommends a plan (no login)', async ({ page }) => {
    await page.goto('/')

    await expect(async () => {
      await page.getByRole('button', { name: 'Find my plan' }).click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })

    const dialog = page.getByRole('dialog')
    // Walk the three steps (new lifter / 2–3 days / keep it simple) → the beginner plan.
    await dialog.getByRole('button', { name: 'New to lifting' }).click()
    await dialog.getByRole('button', { name: '2–3 days' }).click()
    await dialog.getByRole('button', { name: 'Keep it simple' }).click()
    await expect(dialog.getByText('We recommend')).toBeVisible()
    await expect(dialog.getByText('Beginner 5x5 Linear')).toBeVisible()

    // Starting a plan requires an account, so it funnels to /auth.
    await dialog.getByRole('button', { name: 'Start this plan' }).click()
    await expect(page).toHaveURL(/\/auth/, { timeout: 5000 })
  })
})

// Reuses the authenticated session from auth.setup.ts.
test('authenticated visitors skip marketing', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/today/, { timeout: 15000 })
})
