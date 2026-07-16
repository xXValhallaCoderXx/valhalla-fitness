import { expect, test, type Page } from '@playwright/test'
import { DEMO_USER, login } from './support/auth'

// Exercises the real login flow, so it must start logged-out (ignore the
// shared authenticated session).
test.use({ storageState: { cookies: [], origins: [] } })

function sessionCookies(page: Page) {
  return page
    .context()
    .cookies()
    .then((items) => items.filter((cookie) => /sb-.*-auth-token/.test(cookie.name)))
}

test('demo user can log in and reopen with a persistent session', async ({ browser, page }) => {
  await login(page, DEMO_USER)
  await expect(page.getByText('Sheetless').first()).toBeVisible()

  const authCookies = await sessionCookies(page)
  expect(authCookies.length).toBeGreaterThan(0)
  for (const cookie of authCookies) {
    expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 24 * 60 * 60)
  }

  const storageState = await page.context().storageState()
  const reopenedContext = await browser.newContext({ baseURL: 'http://localhost:3000', storageState })
  try {
    const reopenedPage = await reopenedContext.newPage()
    await reopenedPage.goto('/today')
    await expect(reopenedPage).toHaveURL(/\/today/)
    await expect(reopenedPage.getByRole('button', { name: 'Account menu' })).toBeVisible()
  } finally {
    await reopenedContext.close()
  }

  await page.screenshot({ path: 'test-results/demo-login.png' })
})

test('explicit log out removes the persistent session', async ({ page }) => {
  await login(page, DEMO_USER)
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()

  await expect(page).toHaveURL(/\/auth/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  expect(await sessionCookies(page)).toHaveLength(0)
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
