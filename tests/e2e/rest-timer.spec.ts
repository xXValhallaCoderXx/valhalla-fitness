import { expect, test, type Page } from '@playwright/test'
import { setAutoStartTimer } from './support/profile'

/** Resume (or start) a live session from Today, hydration-safe. */
async function enterSession(page: Page) {
  await page.goto('/today')
  const start = page.getByRole('button', { name: /resume workout|resume session|start workout|start next session/i })
  await expect(async () => {
    await start.first().click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+/, { timeout: 2000 })
  }).toPass({ timeout: 20000 })
}

const isMobileViewport = (page: Page) => (page.viewportSize()?.width ?? 0) < 768

/** Complete the first available set (Focus card on mobile, Overview row on desktop). */
async function completeFirstSet(page: Page) {
  const pill = page.getByTestId('rest-timer-pill')
  if (isMobileViewport(page)) {
    const enterFocus = page.getByTestId('enter-focus')
    if (await enterFocus.isVisible().catch(() => false)) await enterFocus.click()
    await expect(page.getByTestId('focus-view')).toBeVisible()
    await expect(async () => {
      await page.getByTestId('focus-log-set').click()
      await expect(pill).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 15000 })
  } else {
    const completeButton = page.getByRole('button', { name: /^Complete set \d+$/ }).first()
    await expect(async () => {
      await completeButton.click()
      await expect(pill).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 15000 })
  }
}

test.describe('rest timer', () => {
  test.beforeEach(async () => {
    // Deterministic regardless of prior toggles in Settings.
    await setAutoStartTimer(true)
  })

  test('auto-starts a countdown after a completed set, ticks down, and skips', async ({ page }) => {
    await enterSession(page)

    const pill = page.getByTestId('rest-timer-pill')
    // No timer before any set is completed.
    await expect(pill).toBeHidden()

    await completeFirstSet(page)

    // Shows a m:ss countdown that decreases.
    const remaining = page.getByTestId('rest-timer-remaining')
    await expect(remaining).toHaveText(/^\d+:\d{2}$/)
    const first = (await remaining.textContent())?.trim()
    await expect(async () => {
      expect((await remaining.textContent())?.trim()).not.toBe(first)
    }).toPass({ timeout: 4000 })

    // Skip dismisses the pill.
    await page.getByRole('button', { name: 'Skip rest' }).click()
    await expect(pill).toBeHidden()
  })

  test('does not start a timer when auto-start is off', async ({ page }) => {
    await setAutoStartTimer(false)
    await enterSession(page)

    await completeFirstSetExpectingNoPill(page)
  })
})

/** Complete a set with auto-start off, asserting the pill never appears. */
async function completeFirstSetExpectingNoPill(page: Page) {
  const pill = page.getByTestId('rest-timer-pill')
  if (isMobileViewport(page)) {
    const enterFocus = page.getByTestId('enter-focus')
    if (await enterFocus.isVisible().catch(() => false)) await enterFocus.click()
    await expect(page.getByTestId('focus-view')).toBeVisible()
    const logButton = page.getByTestId('focus-log-set')
    await expect(async () => {
      await logButton.click()
      // The card advances to the next set once the log lands.
      await expect(logButton).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 15000 })
  } else {
    const completeButton = page.getByRole('button', { name: /^Complete set \d+$/ }).first()
    await expect(async () => {
      await completeButton.click()
      await expect(page.getByRole('button', { name: /^Edit set \d+$/ }).first()).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 15000 })
  }
  await expect(pill).toBeHidden()
}
