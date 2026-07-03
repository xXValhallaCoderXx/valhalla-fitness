import { expect, test, type Locator, type Page } from '@playwright/test'
import { login } from './support/auth'

/**
 * Full post-workout journey: log a session, finish it, and apply the suggested load updates
 * from the summary. Regression for the "invalid input syntax for type uuid: pending-accessory-*"
 * failure (summary decisions must carry real DB ids), plus the numeric accessory suggestion and
 * the weight carry-over between straight sets.
 *
 * Finishing a session advances program state, so this spec drives its own demo account —
 * no other spec logs in as demo.power, keeping parallel workers isolated.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const DEMO_POWER = { email: 'demo.power@sheetless.local', password: 'DemoPass123!' }

const isMobileViewport = (page: Page) => (page.viewportSize()?.width ?? 0) < 768

/** The expanded card's row for a set, located via its Complete/Edit button. */
function setRow(page: Page, setIndex: number): Locator {
  return page
    .locator('div[role="button"]')
    .filter({ has: page.getByRole('button', { name: new RegExp(`^(Complete|Edit) set ${setIndex}$`) }) })
}

/** Complete every visible set row at its pre-filled values (only the expanded card has rows). */
async function completeVisibleSets(page: Page) {
  const completeButtons = page.getByRole('button', { name: /^Complete set \d+$/ })
  for (;;) {
    const previous = await completeButtons.count()
    if (previous === 0) break
    await expect(async () => {
      await completeButtons.first().click()
      await expect(completeButtons).toHaveCount(previous - 1, { timeout: 2000 })
    }).toPass({ timeout: 20000 })
  }
}

test('finishing a session and applying all load updates succeeds', async ({ page }) => {
  test.skip(isMobileViewport(page), 'Desktop overview drives set completion; one project keeps the account state linear')
  test.setTimeout(180_000)

  await login(page, DEMO_POWER)

  // A pending progression review (seeded, or left by a previous run) blocks the Start button —
  // clear it through the Today review modal first.
  const reviewBanner = page.getByRole('button', { name: 'Review' })
  await reviewBanner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  if (await reviewBanner.isVisible()) {
    const acceptAll = page.getByRole('button', { name: /^Accept all/ })
    await expect(async () => {
      await reviewBanner.click()
      await expect(acceptAll).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 15000 })
    await acceptAll.click()
    await page.getByRole('button', { name: 'Done' }).click()
  }

  const start = page.getByRole('button', { name: /resume workout|resume session|start workout|start next session/i })
  await expect(start.first()).toBeEnabled({ timeout: 15000 })
  await expect(async () => {
    await start.first().click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 2000 })
  }).toPass({ timeout: 20000 })

  const railButtons = page.locator('aside button')
  await expect(railButtons.first()).toBeVisible({ timeout: 15000 })

  // The first incomplete movement (the main lift) opens expanded — complete it at the
  // prescribed weights/reps so a main progression decision is generated.
  await completeVisibleSets(page)

  // Open the first accessory: collapsed cards expose the role chip in their accessible name
  // ("Back Extension accessory 3 sets · …"), unlike the rail entries or "Add accessory".
  const accessoryCard = page.locator('main').getByRole('button', { name: /accessory \d+ sets/i }).first()
  await expect(async () => {
    await accessoryCard.click()
    await expect(page.getByRole('button', { name: 'Complete set 1', exact: true })).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 15000 })

  // Set 1: type the weight — select-on-focus must replace the pre-filled value, not append.
  const set1 = setRow(page, 1)
  const weight1 = set1.locator('input[type="number"]').first()
  const reps1 = set1.locator('input[type="number"]').nth(1)
  await expect(async () => {
    await reps1.click() // park focus elsewhere so the next click re-triggers select-on-focus
    await weight1.click()
    await weight1.pressSequentially('21')
    await expect(weight1).toHaveValue('21', { timeout: 1000 })
  }).toPass({ timeout: 15000 })

  // Top of the rep range with reps to spare on every set → "Add load next time" decision.
  const loggedLoads = [21]
  await reps1.fill('15')
  await set1.getByRole('button', { name: 'Reps in reserve (RIR)' }).click()
  await set1.getByRole('button', { name: '3+ — three or more reps' }).click()
  await set1.getByRole('button', { name: 'Complete set 1', exact: true }).click()
  await expect(set1.getByRole('button', { name: 'Edit set 1', exact: true })).toBeVisible({ timeout: 10000 })

  for (;;) {
    const nextComplete = page.getByRole('button', { name: /^Complete set \d+$/ }).first()
    if (!(await nextComplete.isVisible().catch(() => false))) break
    const setIndex = Number((await nextComplete.getAttribute('aria-label'))?.match(/\d+/)?.[0])
    const row = setRow(page, setIndex)
    loggedLoads.push(Number(await row.locator('input[type="number"]').first().inputValue()))
    await row.locator('input[type="number"]').nth(1).fill('15')
    await nextComplete.click()
    await expect(page.getByRole('button', { name: `Edit set ${setIndex}`, exact: true })).toBeVisible({ timeout: 10000 })
  }

  // Finish — the variation/second accessory are unlogged, so confirm the partial finish.
  await page.locator('[data-tour="live-finish"]').click()
  const finishAnyway = page.getByRole('button', { name: 'Finish anyway' })
  await finishAnyway.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  if (await finishAnyway.isVisible()) await finishAnyway.click()

  await expect(page).toHaveURL(/\/summary$/, { timeout: 30000 })
  await expect(page.getByText(/load updates? ready/i)).toBeVisible({ timeout: 15000 })
  // The accessory suggestion is numeric: heaviest logged weight + the 2.5 kg increment.
  const suggested = Math.max(...loggedLoads) + 2.5
  const suggestedLabel = Number.isInteger(suggested) ? String(suggested) : suggested.toFixed(1)
  await expect(page.getByText(`${suggestedLabel} kg`).first()).toBeVisible()

  await page.getByRole('button', { name: /^Apply all \d+ & finish$/ }).click()
  await expect(page.getByText('Loads updated').first()).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Could not apply updates')).toHaveCount(0)
})
