import { expect, test, type Locator, type Page } from '@playwright/test'
import { login, type Credentials } from './support/auth'
import {
  addDiscardFeedback,
  countSessionsWithTitle,
  getDiscardResidue,
  getProgramDiscardState,
  getSessionDiscardState,
} from './support/discard'

test.use({ storageState: { cookies: [], origins: [] } })

const DISCARD_USER: Credentials = {
  email: 'demo.discard@sheetless.local',
  password: 'DemoPass123!',
}
const PLANNED_WORKOUT_TITLE = 'Day 1'
const AD_HOC_TITLE = 'Discard regression ad hoc'

function setRow(page: Page, setIndex: number): Locator {
  return page
    .locator('div[role="button"]')
    .filter({ has: page.getByRole('button', { name: new RegExp(`^(Complete|Edit) set ${setIndex}$`) }) })
}

async function confirmDiscard(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Discard workout?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Keep workout' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Discard workout', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/, { timeout: 20000 })
  await expect(dialog).toBeHidden()
}

async function openDiscardDialog(page: Page, discard: Locator) {
  const dialog = page.getByRole('dialog', { name: 'Discard workout?' })
  await expect(discard).toBeVisible({ timeout: 15000 })
  await expect(async () => {
    if (!(await dialog.isVisible().catch(() => false))) await discard.click()
    await expect(dialog).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
}

async function discardActiveFromTodayIfPresent(page: Page) {
  await page.goto('/today')
  const discard = page.getByRole('button', { name: 'Discard workout', exact: true })
  await discard.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  if (!(await discard.isVisible().catch(() => false))) return
  await openDiscardDialog(page, discard)
  await confirmDiscard(page)
}

async function startPlannedWorkout(page: Page) {
  const start = page.getByRole('button', { name: /start workout|start next session/i }).first()
  await expect(start).toBeEnabled({ timeout: 15000 })
  await expect(async () => {
    await start.click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 2500 })
  }).toPass({ timeout: 20000 })
  return sessionIdFromUrl(page.url())
}

async function discardFromLiveSession(page: Page) {
  const discard = page.getByRole('button', { name: 'Discard workout', exact: true }).filter({ visible: true })
  await openDiscardDialog(page, discard)
  await confirmDiscard(page)
}

async function enterMobileOverview(page: Page) {
  const focusView = page.getByTestId('focus-view')
  await expect(focusView).toBeVisible({ timeout: 15000 })
  const discard = focusView.getByRole('button', { name: 'Discard workout', exact: true })
  await expect(discard).toBeVisible()
  const box = await discard.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)

  await openDiscardDialog(page, discard)
  const dialog = page.getByRole('dialog', { name: 'Discard workout?' })
  await dialog.getByRole('button', { name: 'Keep workout' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/sessions\/[^/]+$/)

  await page.getByRole('button', { name: 'Back to overview' }).click()
  await expect(focusView).toBeHidden()
}

async function completeFirstSet(page: Page) {
  const row = setRow(page, 1)
  const complete = row.getByRole('button', { name: 'Complete set 1', exact: true })
  await expect(complete).toBeVisible({ timeout: 15000 })
  await complete.click()
  await expect(row.getByRole('button', { name: 'Edit set 1', exact: true })).toBeVisible({ timeout: 15000 })
}

async function addPersistentAccessory(page: Page) {
  await page.getByTestId('add-exercise').click()
  const dialog = page.getByRole('dialog', { name: 'Add accessory' })
  const search = dialog.getByPlaceholder('Search accessory movements')
  await expect(search).toBeVisible({ timeout: 15000 })
  await search.fill('Overhead Triceps Extension')
  await dialog.getByRole('button', { name: /^Overhead Triceps Extension / }).click()
  await dialog.getByRole('checkbox', { name: /Rest of/i }).check()
  await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(dialog).toBeHidden({ timeout: 15000 })
}

async function removePersistentAccessory(page: Page) {
  const card = page.getByTestId('movement-card').filter({ hasText: 'Face Pull' })
  await expect(card).toBeVisible({ timeout: 15000 })
  await card.getByRole('button', { name: 'Remove exercise' }).click()
  const dialog = page.getByRole('dialog', { name: 'Remove Face Pull?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('checkbox', { name: 'Also remove from future appearances' }).check()
  await dialog.getByRole('button', { name: 'Remove exercise', exact: true }).click()
  await expect(dialog).toBeHidden({ timeout: 15000 })
}

async function reorderPersistentAccessories(page: Page) {
  const facePull = page.getByTestId('movement-card').filter({ hasText: 'Face Pull' })
  const handle = facePull.getByTestId('accessory-drag-handle')
  await handle.focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('status')).toContainText('Draggable item')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')
  await expect(facePull.getByTestId('accessory-drag-handle')).toBeEnabled({ timeout: 15000 })
}

async function swapAccessoryForPhase(page: Page) {
  const accessoryCard = page
    .getByTestId('movement-card')
    .filter({ has: page.getByRole('heading', { name: 'Back Extension', exact: true }) })
  await accessoryCard.getByRole('button', { name: /Back Extension accessory/i }).click()
  await accessoryCard.getByRole('button', { name: 'Swap movement' }).click()

  const dialog = page.getByRole('dialog', { name: 'Swap movement' })
  const phaseScope = dialog.getByRole('checkbox', { name: /Use for this slot/i })
  await expect(phaseScope).toBeEnabled({ timeout: 15000 })
  await phaseScope.check()
  const submit = dialog.getByRole('button', { name: 'Swap', exact: true })
  await expect(submit).toBeEnabled({ timeout: 15000 })
  await submit.click()
  await expect(dialog).toBeHidden({ timeout: 15000 })
}

async function addAndNameAdHocExercise(page: Page) {
  await page.getByTestId('add-exercise').click()
  const search = page.getByPlaceholder('Search exercises')
  await expect(search).toBeVisible({ timeout: 15000 })
  await search.fill('Bench')
  await page.getByRole('button', { name: /^Bench Press / }).first().click()
  await page.getByTestId('confirm-add-exercise').click()
  await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible({ timeout: 15000 })

  await page.getByRole('button', { name: 'Rename workout' }).click()
  const title = page.getByPlaceholder('e.g. Push day')
  await expect(title).toBeVisible()
  await title.fill(AD_HOC_TITLE)
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByRole('heading', { name: AD_HOC_TITLE })).toBeVisible({ timeout: 15000 })
}

test('discard restores a programmed workout and permanently removes ad-hoc drafts', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768, 'Stateful discard coverage runs once on mobile')
  test.setTimeout(240_000)

  await login(page, DISCARD_USER)
  await discardActiveFromTodayIfPresent(page)
  await expect(page.getByRole('heading', { name: PLANNED_WORKOUT_TITLE })).toBeVisible({ timeout: 15000 })

  const baselineProgram = await getProgramDiscardState(DISCARD_USER)
  const firstSessionId = await startPlannedWorkout(page)
  const initialSession = await getSessionDiscardState(DISCARD_USER, firstSessionId)
  expect(initialSession).not.toBeNull()
  await enterMobileOverview(page)

  await completeFirstSet(page)
  await swapAccessoryForPhase(page)
  await addPersistentAccessory(page)
  await reorderPersistentAccessories(page)
  await removePersistentAccessory(page)
  await addDiscardFeedback(DISCARD_USER, firstSessionId)

  await expect.poll(async () => (await getProgramDiscardState(DISCARD_USER)).overrides.length).toBe(
    baselineProgram.overrides.length + 1,
  )
  await expect.poll(async () => (await getProgramDiscardState(DISCARD_USER)).additions.map((row) => row.movement_id)).toContain(
    'overhead_triceps_extension',
  )
  await expect.poll(async () => (await getProgramDiscardState(DISCARD_USER)).additions.map((row) => row.movement_id)).not.toContain(
    'face_pull',
  )
  await expect.poll(async () => getDiscardResidue(DISCARD_USER, firstSessionId, initialSession!.exerciseIds)).toMatchObject({
    feedback: 1,
    journal: expect.any(Number),
  })
  expect((await getDiscardResidue(DISCARD_USER, firstSessionId, initialSession!.exerciseIds)).journal).toBeGreaterThan(0)

  await discardFromLiveSession(page)
  await expect.poll(() => getProgramDiscardState(DISCARD_USER)).toEqual(baselineProgram)
  await expect.poll(() => getSessionDiscardState(DISCARD_USER, firstSessionId)).toBeNull()
  await expect.poll(() => getDiscardResidue(DISCARD_USER, firstSessionId, initialSession!.exerciseIds)).toEqual({
    sessions: 0,
    exercises: 0,
    sets: 0,
    substitutions: 0,
    feedback: 0,
    journal: 0,
  })

  // Discarding does not advance the programme: the same planned workout starts
  // again with the original movements, sets, and completion state.
  await expect(page.getByRole('heading', { name: PLANNED_WORKOUT_TITLE })).toBeVisible({ timeout: 15000 })
  const restartedSessionId = await startPlannedWorkout(page)
  expect(restartedSessionId).not.toBe(firstSessionId)
  await expect.poll(async () => (await getSessionDiscardState(DISCARD_USER, restartedSessionId))?.state).toEqual(
    initialSession!.state,
  )

  // The compact Focus header is independently wired and remains inside the
  // Pixel 5 viewport. Discard this clean restart directly from Focus.
  const focusDiscard = page.getByTestId('focus-view').getByRole('button', { name: 'Discard workout', exact: true })
  await openDiscardDialog(page, focusDiscard)
  await confirmDiscard(page)
  await expect.poll(() => getSessionDiscardState(DISCARD_USER, restartedSessionId)).toBeNull()

  // The active-session card on Today exposes the same safe discard path.
  const todaySessionId = await startPlannedWorkout(page)
  await page.goto('/today')
  const todayDiscard = page.getByRole('button', { name: 'Discard workout', exact: true })
  await openDiscardDialog(page, todayDiscard)
  await confirmDiscard(page)
  await expect.poll(() => getSessionDiscardState(DISCARD_USER, todaySessionId)).toBeNull()
  await expect(page.getByRole('heading', { name: PLANNED_WORKOUT_TITLE })).toBeVisible({ timeout: 15000 })

  // Ad-hoc drafts use the same hard-delete semantics and never become history.
  await page.getByRole('button', { name: /blank workout/i }).click()
  await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 20000 })
  const adHocSessionId = sessionIdFromUrl(page.url())
  await addAndNameAdHocExercise(page)
  await completeFirstSet(page)
  const adHocSession = await getSessionDiscardState(DISCARD_USER, adHocSessionId)
  expect(adHocSession).not.toBeNull()

  await discardFromLiveSession(page)
  await expect.poll(() => getDiscardResidue(DISCARD_USER, adHocSessionId, adHocSession!.exerciseIds)).toEqual({
    sessions: 0,
    exercises: 0,
    sets: 0,
    substitutions: 0,
    feedback: 0,
    journal: 0,
  })
  await expect.poll(() => countSessionsWithTitle(DISCARD_USER, AD_HOC_TITLE)).toBe(0)

  await page.goto('/history')
  const sessionsTab = page.getByRole('tab', { name: 'Sessions' })
  await expect(async () => {
    await sessionsTab.click()
    await expect(sessionsTab).toHaveAttribute('aria-selected', 'true', { timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: 'No completed sessions yet' })).toBeVisible()
  await expect(page.getByText(AD_HOC_TITLE, { exact: true })).toHaveCount(0)
})

function sessionIdFromUrl(url: string) {
  const sessionId = new URL(url).pathname.match(/^\/sessions\/([^/]+)$/)?.[1]
  if (!sessionId) throw new Error(`Expected a live session URL, received ${url}`)
  return sessionId
}
