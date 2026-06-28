import { expect, test } from '@playwright/test'
import { DEMO_USER, login } from './support/auth'

// Exercises the real login flow, so it must start logged-out (ignore the
// shared authenticated session).
test.use({ storageState: { cookies: [], origins: [] } })

test('demo user can log in with email + password', async ({ page }) => {
  await login(page, DEMO_USER)
  await expect(page.getByText('Sheetless').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/demo-login.png' })
})
