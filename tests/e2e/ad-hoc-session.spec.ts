import { expect, test, type Locator, type Page } from '@playwright/test'
import { login } from './support/auth'

/**
 * Full ad-hoc workout journey: start a blank workout from Today (not gated by the seeded
 * pending review), pick an exercise from the full catalog, log a set with the "last time"
 * seed, rename, finish (no plan progression), find it in Insights → Sessions via the
 * Ad hoc filter + search, favourite it (named), and restart it from the Plans page with
 * the previous session's numbers seeded.
 *
 * Drives its own demo account (demo.ready) so parallel workers stay isolated. Ad-hoc
 * sessions never advance programme state, so reruns only accumulate ad-hoc history —
 * unique titles keep the assertions unambiguous, and any live session left by an aborted
 * run is finished up-front.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const DEMO_READY = { email: 'demo.ready@sheetless.local', password: 'DemoPass123!' }

const isMobileViewport = (page: Page) => (page.viewportSize()?.width ?? 0) < 768

/** The expanded card's row for a set, located via its Complete/Edit button. */
function setRow(page: Page, setIndex: number): Locator {
  return page
    .locator('div[role="button"]')
    .filter({ has: page.getByRole('button', { name: new RegExp(`^(Complete|Edit) set ${setIndex}$`) }) })
}

/** Finish whatever session an aborted earlier run may have left in progress. */
async function finishAnyActiveSession(page: Page) {
  const resume = page.getByRole('button', { name: /resume workout/i })
  await resume.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  if (!(await resume.isVisible().catch(() => false))) return
  await expect(async () => {
    await resume.click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 2000 })
  }).toPass({ timeout: 20000 })
  await finishCurrentSession(page)
  await page.goto('/today')
}

async function finishCurrentSession(page: Page) {
  await expect(async () => {
    await page.locator('[data-tour="live-finish"]').click()
    await expect(
      page.getByRole('button', { name: 'Finish anyway' }).or(page.getByText(/\/summary|Session finished/)),
    ).toBeVisible({ timeout: 2000 })
  })
    .toPass({ timeout: 20000 })
    .catch(() => {})
  const finishAnyway = page.getByRole('button', { name: 'Finish anyway' })
  if (await finishAnyway.isVisible().catch(() => false)) await finishAnyway.click()
  await expect(page).toHaveURL(/\/summary$/, { timeout: 30000 })
}

test('ad-hoc workout: start, log, rename, finish, find, favourite, restart', async ({ page }) => {
  test.skip(isMobileViewport(page), 'Desktop overview drives the add-exercise flow; one project keeps account state linear')
  test.setTimeout(240_000)

  const title = `Ad-hoc e2e ${Date.now()}`

  await login(page, DEMO_READY)
  await finishAnyActiveSession(page)

  // Start a blank workout from the Today header. demo.ready has a seeded pending deadlift
  // review which gates "Start workout" — the ad-hoc entry must NOT be gated by it.
  const blankWorkout = page.getByRole('button', { name: /blank workout/i })
  await expect(blankWorkout).toBeEnabled({ timeout: 15000 })
  await expect(async () => {
    await blankWorkout.click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 3000 })
  }).toPass({ timeout: 20000 })

  // Fresh ad-hoc session: empty state + full-catalog picker (competition lifts included).
  await expect(page.getByRole('heading', { name: 'No exercises yet' })).toBeVisible({ timeout: 15000 })
  const addExercise = page.getByTestId('add-exercise')
  const searchExercises = page.getByPlaceholder('Search exercises')
  await expect(async () => {
    await addExercise.click()
    await expect(searchExercises).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20000 })
  await expect(async () => {
    await searchExercises.fill('Bench')
    await expect(searchExercises).toHaveValue('Bench', { timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await page.getByRole('button', { name: /^Bench Press / }).first().click()
  await page.getByTestId('confirm-add-exercise').click()

  // The card opens with the main-lift role and a "Last time" chip fed by plan history.
  await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible({ timeout: 15000 })
  await expect(page.locator('main').getByText('Last time')).toBeVisible({ timeout: 15000 })

  // Weight is pre-seeded from the comparable; log set 1 at a distinctive load.
  const set1 = setRow(page, 1)
  const weight1 = set1.locator('input[type="number"]').first()
  const reps1 = set1.locator('input[type="number"]').nth(1)
  expect(Number(await weight1.inputValue())).toBeGreaterThan(0)
  await expect(async () => {
    await reps1.click()
    await weight1.click()
    await weight1.pressSequentially('33')
    await expect(weight1).toHaveValue('33', { timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await reps1.fill('8')
  await set1.getByRole('button', { name: 'Complete set 1', exact: true }).click()
  await expect(set1.getByRole('button', { name: 'Edit set 1', exact: true })).toBeVisible({ timeout: 10000 })

  // Name the workout from the context bar.
  await expect(async () => {
    await page.getByRole('button', { name: 'Rename workout' }).click()
    await expect(page.getByPlaceholder('e.g. Push day')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 15000 })
  await page.getByPlaceholder('e.g. Push day').fill(title)
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 10000 })

  // Finish (2 sets unlogged → confirm). Ad-hoc finishes produce no load-update review.
  await finishCurrentSession(page)
  await expect(page.getByText(/load updates? ready/i)).toHaveCount(0)

  // Insights → Sessions: findable via the Ad hoc filter and via search.
  await page.goto('/history')
  await expect(async () => {
    await page.getByRole('tab', { name: 'Sessions' }).click()
    await expect(page.getByPlaceholder('Search sessions')).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 20000 })
  const adHocChip = page.getByRole('button', { name: 'Ad hoc', exact: true })
  await expect(adHocChip).toBeVisible({ timeout: 15000 })
  await adHocChip.click()
  const sessionRowButton = page.getByRole('button', { name: new RegExp(title) })
  await expect(sessionRowButton.first()).toBeVisible({ timeout: 15000 })
  await page.getByPlaceholder('Search sessions').fill(title)
  await expect(sessionRowButton.first()).toBeVisible()

  // Open the summary: per-set data, then favourite it (name prefilled from the session).
  await sessionRowButton.first().click()
  await expect(page.getByText('Workout summary', { exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: 'Repeat workout' })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Favourite', exact: true }).click()
  const favouriteName = page.getByPlaceholder('e.g. Push day')
  await expect(favouriteName).toBeVisible({ timeout: 10000 })
  await expect(favouriteName).toHaveValue(title)
  await page.getByRole('button', { name: 'Save favourite' }).click()
  await expect(page.getByRole('button', { name: 'Favourited' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Saved to favourites')).toBeVisible({ timeout: 10000 })

  // Plans page: the favourite has a card; starting it seeds a fresh copy of the workout
  // with the just-finished session as the "last time" comparable (weight 33 pre-filled).
  await page.goto('/templates')
  await expect(page.getByText('Favourite workouts')).toBeVisible({ timeout: 15000 })
  await expect(async () => {
    await page.getByRole('button', { name: `Start ${title}` }).click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 3000 })
  }).toPass({ timeout: 20000 })

  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible({ timeout: 15000 })
  await expect(page.locator('main').getByText('Last time')).toBeVisible({ timeout: 15000 })
  const repeatWeight = setRow(page, 1).locator('input[type="number"]').first()
  await expect(repeatWeight).toHaveValue('33', { timeout: 15000 })

  // Leave the account without a live session so reruns start clean.
  await finishCurrentSession(page)
})
