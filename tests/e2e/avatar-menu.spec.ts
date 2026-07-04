import { expect, test, type Page } from '@playwright/test'
import { DEMO_USER, login } from './support/auth'

const isMobileViewport = (page: Page) => (page.viewportSize()?.width ?? 0) < 768

/** Open the top-right avatar dropdown, hydration-safe (pre-hydration clicks no-op). */
async function openMenu(page: Page) {
  const menu = page.getByRole('menu')
  await expect(async () => {
    await page.getByRole('button', { name: 'Account menu' }).click()
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
  return menu
}

// Uses the shared authenticated session (auth.setup.ts); read-only.
test('avatar menu shows the account and opens Settings', async ({ page }) => {
  await page.goto('/today')
  const menu = await openMenu(page)

  await expect(menu.getByText(DEMO_USER.email)).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Log out' })).toBeVisible()

  await menu.getByRole('menuitem', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/\/settings/, { timeout: 10000 })
})

test('units quick-toggle saves without closing the menu', async ({ page }) => {
  test.skip(isMobileViewport(page), 'Mutates the shared account units — one project keeps the runs from racing each other')

  await page.goto('/today')
  const menu = await openMenu(page)

  const kgInput = menu.locator('input[value="kg"]')
  const lbInput = menu.locator('input[value="lb"]')
  await expect(kgInput).toBeChecked() // seeded default

  // The units row is not a menu item, so toggling must not close the dropdown. The control
  // disables while saving; re-enabled + still checked ⇒ the server accepted the change.
  await menu.getByText('lb', { exact: true }).click()
  await expect(lbInput).toBeEnabled({ timeout: 10000 })
  await expect(lbInput).toBeChecked()
  await expect(menu).toBeVisible()

  // Restore the seeded value — other specs render kg-formatted strings.
  await menu.getByText('kg', { exact: true }).click()
  await expect(kgInput).toBeEnabled({ timeout: 10000 })
  await expect(kgInput).toBeChecked()
  await expect(menu).toBeVisible()
})

test.describe('logout', () => {
  // Real sign-out revokes ALL of the account's sessions (global scope), so this runs on
  // demo.logout — an account seeded exclusively for this test — in a fresh context. Never
  // reuse the shared demo.linear storageState or any account another spec logs in as.
  test.use({ storageState: { cookies: [], origins: [] } })

  const DEMO_LOGOUT = { email: 'demo.logout@sheetless.local', password: 'DemoPass123!' }

  test('logs out from the avatar menu', async ({ page }) => {
    test.skip(isMobileViewport(page), 'Global session revocation — one project limits cross-worker interference')

    await login(page, DEMO_LOGOUT)
    const menu = await openMenu(page)
    await menu.getByRole('menuitem', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/auth/, { timeout: 15000 })
  })
})
