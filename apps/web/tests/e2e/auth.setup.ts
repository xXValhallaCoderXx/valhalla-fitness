import { test as setup } from '@playwright/test'
import { login, STORAGE_STATE } from './support/auth'

/**
 * Logs in once and saves the authenticated session to disk. Every other project
 * depends on this and reuses the saved state, so individual tests start
 * already-logged-in (faster, and no repeated hydration-race login).
 */
setup('authenticate', async ({ page }) => {
  await login(page)
  await page.context().storageState({ path: STORAGE_STATE })
})
