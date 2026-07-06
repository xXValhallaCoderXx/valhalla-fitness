import { expect, test } from '@playwright/test'
import { login } from './support/auth'

// The insight surface is server-rendered; charts (recharts) mount after hydration,
// so assertions lean on text/numbers that paint immediately and use toPass where a
// click depends on hydration. Uses the shared demo.linear session (bodyweight + sex
// seeded, active plan) except the prompt-card test, which logs in as demo.wave.

test.describe('insights', () => {
  test('strength tab shows the DOTS score and per-lift trend cards', async ({ page }) => {
    await page.goto('/history?tab=strength')

    await expect(page.getByText(/strength score/i)).toBeVisible()
    // demo.linear has bodyweight + sex, so the score resolves to DOTS.
    await expect(page.getByText('DOTS', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Squat' })).toBeVisible()
    await expect(page.getByText(/current e1rm/i).first()).toBeVisible()

    // The chart container mounts once recharts settles after hydration.
    await expect(async () => {
      await expect(page.locator('.mantine-LineChart-root').first()).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })
  })

  test('range switch toggles without breaking the page', async ({ page }) => {
    await page.goto('/history?tab=strength')
    await expect(page.getByText(/strength score/i)).toBeVisible()

    // SegmentedControl renders clickable labels; verify each option keeps the page intact.
    for (const label of ['All', '1Y', '3M', '8W']) {
      await expect(async () => {
        await page.getByText(label, { exact: true }).click()
        await expect(page.getByText(/strength score/i)).toBeVisible({ timeout: 1000 })
      }).toPass({ timeout: 15000 })
    }
  })

  test('overview dashboard renders the insight cards', async ({ page }) => {
    await page.goto('/history')

    await expect(page.getByText(/strength score/i)).toBeVisible()
    await expect(page.getByText(/^consistency$/i)).toBeVisible()
    await expect(page.getByText(/muscle balance/i)).toBeVisible()
    await expect(page.getByText(/weekly volume/i)).toBeVisible()

    // demo.linear has bodyweight + sex + history, so the DOTS-over-time trend renders on the
    // Overview strength card (a LineChart) once recharts settles after hydration.
    await expect(async () => {
      await expect(page.locator('.mantine-LineChart-root').first()).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })
  })

  test('settings logs a bodyweight entry', async ({ page }) => {
    await page.goto('/settings')

    const input = page.getByLabel(/bodyweight in/i)
    const logButton = page.getByRole('button', { name: 'Log weight' })

    // Mantine NumberInput (react-number-format) ignores fill(); type so onChange fires
    // and the Log button enables once React has hydrated.
    await expect(async () => {
      await input.click()
      await input.pressSequentially('82', { delay: 30 })
      await expect(logButton).toBeEnabled({ timeout: 1000 })
    }).toPass({ timeout: 15000 })

    await logButton.click()
    // On success the logger resets the weight, disabling the button again.
    await expect(logButton).toBeDisabled({ timeout: 10000 })
  })

  test('bodyweight prompt appears for a user without bodyweight', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    try {
      await login(page, { email: 'demo.wave@sheetless.local', password: 'DemoPass123!' })
      await page.goto('/history')
      await expect(page.getByText(/unlock your strength score/i)).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
