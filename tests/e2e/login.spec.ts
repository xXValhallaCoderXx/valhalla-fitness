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

test('magic-link option shows the sent confirmation, then returns to the form', async ({ page }) => {
  await page.goto('/auth')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  const email = page.getByPlaceholder('name@example.com')
  const sendLink = page.getByRole('button', { name: /email me a one-time link/i })

  // The form is server-rendered — re-fill until React hydrates and enables the button
  // (the button only enables once the email is client-validated, so this implies hydration).
  await expect(async () => {
    await email.fill(DEMO_USER.email)
    await expect(sendLink).toBeEnabled({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  await sendLink.click()

  // Swaps the form for the "sent" confirmation naming the recipient.
  await expect(page.getByRole('heading', { name: /check your inbox/i })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(DEMO_USER.email)).toBeVisible()

  // Back returns to the sign-in form.
  await page.getByRole('button', { name: /back to sign in/i }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})
