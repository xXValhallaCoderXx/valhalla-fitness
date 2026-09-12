import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Programme setup is a four-step wizard, so anything past step 1 has to be walked to.
 *
 * Arrival is asserted on the step rail's `aria-current`, not on the destination's content: which
 * cards a step renders varies by template (a non-phased programme has no block timeline), and not
 * on the button either, because the mobile action bar labels its forward button "Continue" on
 * every step and so never disappears.
 *
 * Both the desktop nav and the mobile bar are in the DOM at all widths with only one visible,
 * hence the visibility filter. The retry absorbs the SSR hydration race, where a click before
 * React hydrates silently no-ops.
 */
export async function advanceSetupStep(page: Page, stepLabel: string | RegExp) {
  await expect(async () => {
    await page.getByRole('button', { name: /^Continue/ }).filter({ visible: true }).first().click()
    await expect(currentSetupStep(page)).toHaveText(stepLabel, { timeout: 3000 })
  }).toPass({ timeout: 30000 })
}

/** The step rail is the first thing setup renders; use it to know the page is up. */
export function setupStepRail(page: Page): Locator {
  return page.getByRole('list', { name: 'Setup steps' })
}

export function currentSetupStep(page: Page): Locator {
  return setupStepRail(page).locator('[aria-current="step"]')
}
