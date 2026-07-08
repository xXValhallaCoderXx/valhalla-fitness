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

  // The first incomplete movement (the main lift) opens expanded. Bump set 1 to
  // 20 kg over the prescription first — a guaranteed heaviest-weight PR for the
  // summary celebration, independent of seeded history — then complete the rest
  // at the prescribed weights/reps so a main progression decision is generated.
  const mainSet1 = setRow(page, 1)
  const mainWeight = mainSet1.locator('input[type="number"]').first()
  const mainReps = mainSet1.locator('input[type="number"]').nth(1)
  await expect(mainWeight).toBeVisible({ timeout: 15000 })
  await expect(mainWeight).not.toHaveValue('', { timeout: 15000 })
  const prBumpValue = String(Number(await mainWeight.inputValue()) + 20)
  await expect(async () => {
    await mainReps.click() // park focus elsewhere so the next click re-triggers select-on-focus
    await mainWeight.click()
    await mainWeight.pressSequentially(prBumpValue)
    await expect(mainWeight).toHaveValue(prBumpValue, { timeout: 1000 })
  }).toPass({ timeout: 15000 })
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

  // Finish — the modal shows the partial-session warning (variation/second
  // accessory are unlogged); rate the effort and log a win on the way out.
  const finishModal = page.getByTestId('finish-session-modal')
  await expect(async () => {
    await page.locator('[data-tour="live-finish"]').click()
    await expect(finishModal).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20000 })
  await expect(finishModal.getByText(/left to log/)).toBeVisible()
  await finishModal.getByRole('button', { name: 'Effort 8 of 10' }).click()
  await finishModal.getByPlaceholder('Optional').first().fill('e2e: top set moved well')
  await finishModal.getByRole('button', { name: 'Finish workout' }).click()

  await expect(page).toHaveURL(/\/summary$/, { timeout: 30000 })

  // The +20 bump broke the heaviest-weight record — the summary celebrates it.
  const prBanner = page.getByTestId('pr-banner')
  await expect(prBanner).toBeVisible({ timeout: 15000 })
  await expect(prBanner.getByText('Heaviest weight yet').first()).toBeVisible()
  // The reflection card carries the effort rating and the win.
  await expect(page.getByText('8/10')).toBeVisible()
  await expect(page.getByText('e2e: top set moved well')).toBeVisible()

  await expect(page.getByText(/load updates? ready/i)).toBeVisible({ timeout: 15000 })
  // The accessory suggestion is numeric: heaviest logged weight + the 2.5 kg increment.
  const suggested = Math.max(...loggedLoads) + 2.5
  const suggestedLabel = Number.isInteger(suggested) ? String(suggested) : suggested.toFixed(1)
  await expect(page.getByText(`${suggestedLabel} kg`).first()).toBeVisible()

  // --- Beta feedback surfaces (fresh summaries only) ---

  // Per-decision "Something off?" inside the review modal — the popover must escape
  // the modal's scrolling body (withinPortal), so drive it end-to-end.
  const dialog = page.getByRole('dialog')
  await expect(async () => {
    await page.getByRole('button', { name: 'Review each instead' }).click()
    await expect(dialog).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })
  // The trigger's accessible name is its aria-label, not the visible "Something off?" text.
  const somethingOff = /^Report an issue with .* recommendation$/
  await expect(async () => {
    await dialog.getByRole('button', { name: somethingOff }).first().click()
    await expect(page.getByRole('button', { name: 'Weight should increase' })).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })
  await page.getByRole('button', { name: 'Weight should increase' }).click()
  await page.getByTestId('send-decision-feedback').click()
  await expect(page.getByText('Thanks — this helps improve the beta.').first()).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('decision-feedback-sent').first()).toBeVisible()
  await dialog.getByRole('button', { name: 'Decide later' }).click()
  await expect(dialog).toBeHidden({ timeout: 10000 })

  // Same trigger on the "What changed, and why" receipt rows.
  await expect(async () => {
    await page.getByRole('button', { name: somethingOff }).first().click()
    await expect(page.getByRole('button', { name: 'Weight should stay the same' })).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })
  await page.getByRole('button', { name: 'Weight should stay the same' }).click()
  await page.getByTestId('send-decision-feedback').click()
  await expect(page.getByTestId('decision-feedback-sent').first()).toBeVisible({ timeout: 15000 })

  // Post-workout micro-prompt: "No" reveals reason chips; sending collapses to thanks.
  const prompt = page.getByTestId('post-workout-feedback')
  await expect(prompt.getByText('Did Sheetless explain your next workout clearly?')).toBeVisible()
  await prompt.getByRole('button', { name: 'No', exact: true }).click()
  await prompt.getByRole('button', { name: 'The explanation was unclear' }).click()
  await page.getByTestId('post-workout-feedback-message').fill('e2e: expected the receipt to mention the deload rule.')
  await page.getByTestId('send-post-workout-feedback').click()
  await expect(prompt.getByText(/Thanks — noted/)).toBeVisible({ timeout: 15000 })

  await page.getByRole('button', { name: /^Apply all \d+ & finish$/ }).click()
  await expect(page.getByText('Loads updated').first()).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Could not apply updates')).toHaveCount(0)
})
