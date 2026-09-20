import { expect, test } from '@playwright/test'
import { login } from './support/auth'

// Drives its own seeded account: the shared demo.linear session keeps an in-progress workout,
// which hides the ready-state surfaces this spec exercises. demo.wave is read-only here (and its
// only other usage is a magic-link email assertion), so desktop and mobile runs can share it.
test.use({ storageState: { cookies: [], origins: [] } })

const DEMO_WAVE = { email: 'demo.wave@sheetless.local', password: 'DemoPass123!' }

test('Today shows the session rows, the week and last session; body map deep-links Insights', async ({ page }) => {
  await login(page, DEMO_WAVE)

  // The movements are part of the session card now, not a drawer — they are on screen at load.
  const workout = page.getByTestId('today-workout')
  await expect(workout).toBeVisible({ timeout: 15000 })
  await expect(workout.getByText(/\d+ × |\d+ sets|%x/).first()).toBeVisible()
  await expect(workout.getByText(/\d+(\.\d+)? (kg|lb)/).first()).toBeVisible()

  // The header the page used to hide in VisuallyHidden.
  const header = page.getByTestId('today-header')
  await expect(header.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()

  // "This week" counts the programme week's sessions.
  await expect(page.getByTestId('today-week').getByText(/\d+ of \d+ sessions done/)).toBeVisible()

  // The last-session card is desktop-only (02c/02d have no such card on phone).
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    const lastSession = page.getByTestId('today-last-session')
    await expect(lastSession).toBeVisible()
    await expect(lastSession.getByRole('link', { name: /open session|review decisions/i })).toHaveAttribute(
      'href',
      /\/sessions\/.+\/summary/,
    )
  }

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
  await expect(page.getByRole('tab', { selected: true })).toHaveAccessibleName(/muscle/i)
})
