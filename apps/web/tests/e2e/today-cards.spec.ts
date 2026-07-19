import { expect, test } from '@playwright/test'
import { login } from './support/auth'

// Drives its own seeded account: the shared demo.linear session keeps an in-progress workout,
// which hides the ready-state drawers this spec exercises. demo.wave is read-only here (and its
// only other usage is a magic-link email assertion), so desktop and mobile runs can share it.
test.use({ storageState: { cookies: [], origins: [] } })

const DEMO_WAVE = { email: 'demo.wave@sheetless.local', password: 'DemoPass123!' }

test("Today's workout and Recovery check drawers expand; body map deep-links Insights", async ({ page }) => {
  await login(page, DEMO_WAVE)

  // Today's workout: collapsed by default → expand → ledger rows (Sets "5 × 5" / "N sets",
  // Target load "112.5 kg").
  const workout = page.getByTestId('today-workout')
  await expect(workout).toBeVisible({ timeout: 15000 })
  const workoutToggle = workout.getByRole('button', { name: "Today's workout" })
  await expect(workoutToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(async () => {
    await workoutToggle.click()
    await expect(workoutToggle).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await expect(workout.getByText(/\d+ × |\d+ sets/).first()).toBeVisible()
  await expect(workout.getByText(/\d+(\.\d+)? (kg|lb)$/).first()).toBeVisible()

  // Recovery check: expand → body-map link → Insights lands on the Muscle Fatigue tab.
  const recovery = page.getByTestId('recovery-check')
  await expect(recovery).toBeVisible()
  const recoveryToggle = recovery.getByRole('button', { name: 'Recovery check' })
  await expect(async () => {
    await recoveryToggle.click()
    await expect(recoveryToggle).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 })
  }).toPass({ timeout: 15000 })
  const bodyMapLink = recovery.getByRole('link', { name: /body map in insights/i })
  await expect(bodyMapLink).toBeVisible()
  await bodyMapLink.click()
  await expect(page).toHaveURL(/\/history\?tab=body-load/, { timeout: 10000 })
  await expect(page.getByRole('tab', { name: 'Muscle Fatigue' })).toHaveAttribute('aria-selected', 'true')
})
