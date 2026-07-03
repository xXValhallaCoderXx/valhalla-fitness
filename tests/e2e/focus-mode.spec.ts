import { expect, test } from '@playwright/test'
import { setLiveOnboardingDismissed } from './support/profile'

/** Resume (or start) a live session from Today, hydration-safe. */
async function enterSession(page: import('@playwright/test').Page) {
  await page.goto('/today')
  const start = page.getByRole('button', { name: /resume workout|resume session|start workout|start next session/i })
  await expect(async () => {
    await start.first().click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+/, { timeout: 2000 })
  }).toPass({ timeout: 20000 })
}

const isMobileViewport = (page: import('@playwright/test').Page) => (page.viewportSize()?.width ?? 0) < 768

test('mobile focus mode: steppers, RIR, Overview round-trip, exercise nav', async ({ page }) => {
  test.skip(!isMobileViewport(page), 'Focus mode is mobile-only')
  await enterSession(page)

  // A brand-new session can open in Overview; make sure we're in Focus.
  const enterFocus = page.getByTestId('enter-focus')
  if (await enterFocus.isVisible().catch(() => false)) await enterFocus.click()

  const focusView = page.getByTestId('focus-view')
  await expect(focusView).toBeVisible()
  await expect(page.getByTestId('focus-log-set')).toBeVisible()

  // Weight stepper increments (local draft, non-destructive).
  const weight = page.getByLabel('Weight', { exact: true })
  const startWeight = Number(await weight.inputValue())
  await expect(async () => {
    await page.getByRole('button', { name: 'Increase Weight' }).click()
    await expect(weight).not.toHaveValue(String(startWeight), { timeout: 1000 })
  }).toPass({ timeout: 10000 })

  // Typing replaces the seeded value (select-on-focus) — no "050" leading-zero artifacts.
  await page.getByLabel('Reps', { exact: true }).click()
  await weight.click()
  await weight.pressSequentially('50')
  await expect(weight).toHaveValue('50')

  // RIR selection reflects in aria-pressed.
  const rirTwo = page.getByRole('button', { name: '2 — two more reps' })
  await rirTwo.click()
  await expect(rirTwo).toHaveAttribute('aria-pressed', 'true')

  // Overview round-trip.
  await expect(async () => {
    await page.getByTestId('focus-overview').click()
    await expect(focusView).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await expect(page.getByTestId('enter-focus')).toBeVisible()
  await expect(async () => {
    await page.getByTestId('enter-focus').click()
    await expect(focusView).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  // Next-exercise navigation changes the focused movement (when not on the last one).
  const title = page.getByRole('heading', { level: 1 })
  const nextExercise = page.getByTestId('focus-next-exercise')
  if (await nextExercise.isEnabled()) {
    const initial = (await title.textContent())?.trim() ?? ''
    await nextExercise.click()
    await expect(title).not.toHaveText(initial, { timeout: 5000 })
  }
})

test('mobile focus: weight carries to the next set on choose-your-load movements', async ({ page }) => {
  test.skip(!isMobileViewport(page), 'Focus mode is mobile-only')
  await enterSession(page)

  const enterFocus = page.getByTestId('enter-focus')
  if (await enterFocus.isVisible().catch(() => false)) await enterFocus.click()
  await expect(page.getByTestId('focus-view')).toBeVisible()

  // Walk to a "choose your load" movement (accessory): its target chip reads "— × reps".
  const userSelectedTarget = page.getByText(/Target — ×/)
  const nextExercise = page.getByTestId('focus-next-exercise')
  for (let hops = 0; hops < 8 && !(await userSelectedTarget.isVisible().catch(() => false)); hops++) {
    if (!(await nextExercise.isEnabled().catch(() => false))) break
    await nextExercise.click()
    await expect(page.getByTestId('focus-log-set')).toBeVisible()
  }
  test.skip(
    !(await userSelectedTarget.isVisible().catch(() => false)),
    'No open user-selected-load movement left in this session (stale seed)',
  )

  const setLabel = (await page.getByText(/Set \d+ of \d+/).first().textContent()) ?? ''
  const [, current, total] = setLabel.match(/Set (\d+) of (\d+)/) ?? []
  test.skip(!current || current === total, 'On the last set (stale seed) — carry-over needs a next set')

  const weight = page.getByLabel('Weight', { exact: true })
  await page.getByLabel('Reps', { exact: true }).click()
  await weight.click()
  await weight.pressSequentially('33')
  await expect(weight).toHaveValue('33')

  await page.getByTestId('focus-log-set').click()
  // The card advances to the next set and pre-fills the weight just logged.
  await expect(page.getByText(new RegExp(`Current · Set ${Number(current) + 1} of ${total}`)).first()).toBeVisible({
    timeout: 10000,
  })
  await expect(weight).toHaveValue('33')
})

test('mobile focus onboarding: card launches the focus tour and dismisses', async ({ page }) => {
  test.skip(!isMobileViewport(page), 'Focus onboarding is mobile-only')
  await setLiveOnboardingDismissed(false)
  await enterSession(page)

  const card = page.locator('[data-tour="focus-onboarding"]')
  await expect(card).toBeVisible()

  await card.getByRole('button', { name: 'Show me around' }).click()
  await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.driver-popover-title')).toContainText('Your current lift')
  await page.locator('.driver-popover-close-btn').click()
  await expect(page.locator('.driver-popover')).toHaveCount(0)

  await card.getByRole('button', { name: 'Dismiss' }).click()
  await expect(card).toBeHidden({ timeout: 8000 })
})

test('desktop keeps the two-pane overview with no focus chrome', async ({ page }) => {
  test.skip(isMobileViewport(page), 'Desktop-only assertion')
  await enterSession(page)

  await expect(page.getByTestId('focus-view')).toBeHidden()
  await expect(page.getByTestId('enter-focus')).toBeHidden()
  // The desktop frame's MOVEMENTS rail is present.
  await expect(page.getByText('Movements', { exact: true })).toBeVisible()
})
