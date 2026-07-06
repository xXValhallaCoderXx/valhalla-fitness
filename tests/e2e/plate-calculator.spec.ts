import { expect, test, type Page } from '@playwright/test'

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

test('plate calculator opens and shows a per-side breakdown', async ({ page }) => {
  await enterSession(page)

  // On mobile the Plates tool lives in the Focus header; on desktop, on the active movement card.
  if (isMobileViewport(page)) {
    const enterFocus = page.getByTestId('enter-focus')
    if (await enterFocus.isVisible().catch(() => false)) await enterFocus.click()
    await expect(page.getByTestId('focus-view')).toBeVisible()
  }

  await expect(async () => {
    await page.getByRole('button', { name: 'Plate math' }).first().click()
    await expect(page.getByTestId('plate-calculator')).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })

  await expect(page.getByText(/per side/i)).toBeVisible()
  await expect(page.getByTestId('plate-target-input')).toBeVisible()
})
