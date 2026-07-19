import { expect, test, type Page } from '@playwright/test'

/**
 * Global "Beta feedback" entry in the avatar menu: pick a category chip, write a
 * message, send, and get the thanks toast. Uses the shared authenticated session
 * (auth.setup.ts) — inserting a feedback row mutates no training state.
 */

/** Open the top-right avatar dropdown, hydration-safe (pre-hydration clicks no-op). */
async function openMenu(page: Page) {
  const menu = page.getByRole('menu')
  await expect(async () => {
    await page.getByRole('button', { name: 'Account menu' }).click()
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
  return menu
}

test('sends beta feedback from the avatar menu', async ({ page }) => {
  await page.goto('/today')
  const menu = await openMenu(page)
  const dialog = page.getByRole('dialog')

  // Clicking the item closes the menu, so a retry must re-open it first.
  await expect(async () => {
    if (!(await dialog.isVisible())) {
      if (!(await menu.isVisible())) await page.getByRole('button', { name: 'Account menu' }).click()
      await menu.getByRole('menuitem', { name: 'Beta feedback' }).click()
    }
    await expect(dialog).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 20000 })

  const send = page.getByTestId('send-beta-feedback')
  await expect(send).toBeDisabled() // needs a category and a message

  await dialog.getByRole('button', { name: 'Bug', exact: true }).click()
  await page.getByTestId('beta-feedback-message').fill('e2e: the plates view shows the wrong bar weight.')
  await expect(send).toBeEnabled()
  await send.click()

  await expect(page.getByText('Thanks — this helps improve the beta.')).toBeVisible({ timeout: 15000 })
  await expect(dialog).toBeHidden({ timeout: 10000 })
})
