import { expect, type Page } from '@playwright/test'

/** Where the authenticated browser session is cached (see auth.setup.ts). */
export const STORAGE_STATE = 'tests/e2e/.auth/user.json'

export type Credentials = { email: string; password: string }

/**
 * Local demo account seeded by `pnpm demo:seed` (scripts/demo-data.mjs).
 * Override via env to point at a different account/environment.
 */
export const DEMO_USER: Credentials = {
  email: process.env.E2E_DEMO_EMAIL ?? 'demo.linear@sheetless.local',
  password: process.env.E2E_DEMO_PASSWORD ?? 'DemoPass123!',
}

/**
 * Log in through the real UI and wait until the authenticated app shell loads.
 *
 * The auth form is server-rendered, so a single `fill()` can land before React
 * hydrates — the onChange handlers aren't attached yet and the controlled
 * inputs reset to empty, leaving the submit button disabled. Re-filling until
 * the button enables (`expect.toPass`) makes the flow hydration-safe.
 */
export async function login(page: Page, user: Credentials = DEMO_USER) {
  await page.goto('/auth')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  const email = page.getByPlaceholder('name@example.com')
  const password = page.locator('input[type="password"]')
  const submit = page.getByRole('button', { name: /^log in$/i })

  await expect(async () => {
    await email.fill(user.email)
    await password.fill(user.password)
    await expect(submit).toBeEnabled({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  await submit.click()
  await expect(page).toHaveURL(/\/today/, { timeout: 20000 })
}
