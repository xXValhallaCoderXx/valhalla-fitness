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

test('magic-link option shows the sent confirmation, then returns to the form', async ({ page }, testInfo) => {
  // Each project requests a link for a different seeded account so the desktop and mobile
  // runs can't trip Supabase's per-email OTP rate limit by racing each other.
  const magicEmail = testInfo.project.name === 'mobile-chrome' ? 'demo.wave@sheetless.local' : DEMO_USER.email

  await page.goto('/auth')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  const email = page.getByPlaceholder('name@example.com')
  const sendLink = page.getByRole('button', { name: /email me a one-time link/i })

  // The form is server-rendered — re-fill until React hydrates and enables the button
  // (the button only enables once the email is client-validated, so this implies hydration).
  await expect(async () => {
    await email.fill(magicEmail)
    await expect(sendLink).toBeEnabled({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  // Swaps the form for the "sent" confirmation naming the recipient (trimmed copy — the
  // "no password needed" flourish was removed for release). Retried with a pause so a
  // residual OTP rate-limit hit (~1s window) recovers instead of failing the run.
  await expect(async () => {
    await sendLink.click()
    await expect(page.getByRole('heading', { name: /check your inbox/i })).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20000, intervals: [1500] })
  await expect(page.getByText(magicEmail)).toBeVisible()
  await expect(page.getByText(/no password needed/i)).toHaveCount(0)

  // Back returns to the sign-in form.
  await page.getByRole('button', { name: /back to sign in/i }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('create account offers a passwordless email link without the old caption', async ({ page }) => {
  await page.goto('/auth')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  // Switch to sign-up — retry through hydration.
  await expect(async () => {
    await page.getByRole('button', { name: 'Create an account' }).click()
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  await expect(page.getByRole('button', { name: /email me a one-time link/i })).toBeVisible()
  await expect(page.getByText(/skip the password/i)).toHaveCount(0)
})

test('"Forgot?" without an email shows a field error, not an alert', async ({ page }) => {
  await page.goto('/auth')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  // Empty email → required error on the field (retry through hydration).
  await expect(async () => {
    await page.getByRole('button', { name: /forgot/i }).click()
    await expect(page.getByText('Email is required.')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  // An invalid email swaps to the format error; typing clears it.
  const email = page.getByPlaceholder('name@example.com')
  await email.fill('demo')
  await expect(page.getByText('Email is required.')).toHaveCount(0)
  await page.getByRole('button', { name: /forgot/i }).click()
  await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  await email.fill('demo@example.com')
  await expect(page.getByText('Enter a valid email address.')).toHaveCount(0)
})
