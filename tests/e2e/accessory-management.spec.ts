import { expect, test, type Locator, type Page } from '@playwright/test'
import { login } from './support/auth'
import {
  getAccessoryCustomizationState,
  resetAccessoryCustomizationState,
} from './support/profile'

test.use({ storageState: { cookies: [], origins: [] } })

const DEMO_ACCESSORIES = {
  email: 'demo.accessories@sheetless.local',
  password: 'DemoPass123!',
}
const FIRST_ACCESSORY = 'Overhead Triceps Extension'
const SECOND_ACCESSORY = 'Rear Delt Fly'
const PHASE_ACCESSORY = 'Face Pull'

function movementCards(page: Page) {
  return page.getByTestId('movement-card')
}

function addedMovementCards(page: Page) {
  return movementCards(page).filter({ has: page.getByTestId('accessory-drag-handle') })
}

function movementCard(page: Page, movementName: string) {
  return movementCards(page).filter({
    has: page.getByRole('heading', { name: movementName, exact: true }),
  })
}

async function addedMovementNames(page: Page) {
  return addedMovementCards(page).locator('h2, h3').allTextContents()
}

async function plannedMovementNames(page: Page) {
  return movementCards(page).evaluateAll((cards) =>
    cards
      .filter((card) => !card.querySelector('[data-testid="accessory-drag-handle"]'))
      .map((card) => card.querySelector('h2, h3')?.textContent?.trim() ?? ''),
  )
}

async function enterSessionOverview(page: Page) {
  const resume = page.getByRole('button', { name: /resume workout|resume session/i }).first()
  await expect(resume).toBeVisible({ timeout: 15_000 })
  await expect(async () => {
    await resume.click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  await showOverview(page)
}

async function showOverview(page: Page) {
  const focusView = page.getByTestId('focus-view')
  const addExercise = page.getByTestId('add-exercise')
  await expect.poll(async () =>
    await focusView.isVisible().catch(() => false) || await addExercise.isVisible().catch(() => false),
  ).toBe(true)
  if (await focusView.isVisible().catch(() => false)) {
    await expect(async () => {
      await page.getByTestId('focus-overview').click()
      await expect(focusView).toBeHidden({ timeout: 1000 })
    }).toPass({ timeout: 15_000 })
  }
  await expect(addExercise).toBeVisible()
}

async function removeAddedMovement(page: Page, card: Locator, removeFuture = false) {
  const previousCount = await addedMovementCards(page).count()
  await card.getByRole('button', { name: 'Remove exercise' }).click()
  const dialog = page.getByRole('dialog', { name: /^Remove .+\?$/ })
  await expect(dialog).toBeVisible()
  const futureOption = dialog.getByRole('checkbox', { name: /Also remove from/ })
  if (removeFuture && await futureOption.isVisible().catch(() => false)) await futureOption.check()
  await dialog.getByRole('button', { name: 'Remove exercise' }).click()
  await expect(dialog).toBeHidden()
  await expect(addedMovementCards(page)).toHaveCount(previousCount - 1)
}

async function clearPriorTestAdditions(page: Page) {
  while (await addedMovementCards(page).count()) {
    await removeAddedMovement(page, addedMovementCards(page).first(), true)
  }
}

async function addSessionAccessory(page: Page, movementName: string, persistForPhase = false) {
  await page.getByTestId('add-exercise').click()
  const modal = page.getByRole('dialog', { name: 'Add accessory' })
  await expect(modal).toBeVisible()

  const search = modal.getByPlaceholder('Search accessory movements')
  await expect(search).toBeVisible({ timeout: 15_000 })
  await search.fill(movementName)
  await modal.getByRole('button', { name: new RegExp(`^${movementName}`) }).click()
  if (persistForPhase) await modal.getByRole('checkbox', { name: /^Rest of/ }).check()
  await modal.getByRole('button', { name: 'Add', exact: true }).click()

  await expect(modal).toBeHidden({ timeout: 20_000 })
  await expect(movementCard(page, movementName)).toBeVisible()
}

test('added accessories can be reordered and removed from mobile Overview', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768, 'Mobile-only accessory management flow')
  test.setTimeout(120_000)

  await login(page, DEMO_ACCESSORIES)
  await enterSessionOverview(page)
  await clearPriorTestAdditions(page)
  await resetAccessoryCustomizationState(DEMO_ACCESSORIES)
  await expect.poll(async () => (await getAccessoryCustomizationState(DEMO_ACCESSORIES)).accessoryAdditionCount)
    .toBe(0)

  const plannedMovementCount = await movementCards(page).count()
  const originalPlannedMovementNames = await plannedMovementNames(page)
  expect(plannedMovementCount).toBeGreaterThan(0)

  await addSessionAccessory(page, FIRST_ACCESSORY, true)
  await addSessionAccessory(page, SECOND_ACCESSORY, true)

  await expect(addedMovementCards(page)).toHaveCount(2)
  await expect(movementCard(page, FIRST_ACCESSORY).getByTestId('accessory-drag-handle')).toHaveCount(1)
  await expect(movementCard(page, SECOND_ACCESSORY).getByTestId('accessory-drag-handle')).toHaveCount(1)
  await expect(movementCards(page)).toHaveCount(plannedMovementCount + 2)
  expect(await movementCards(page).evaluateAll((cards) =>
    cards.filter((card) => !card.querySelector('[data-testid="accessory-drag-handle"]')).length,
  )).toBe(plannedMovementCount)
  expect(await plannedMovementNames(page)).toEqual(originalPlannedMovementNames)
  expect(await addedMovementNames(page)).toEqual([FIRST_ACCESSORY, SECOND_ACCESSORY])
  await expect.poll(async () => getAccessoryCustomizationState(DEMO_ACCESSORIES)).toMatchObject({
    movementIds: ['overhead_triceps_extension', 'rear_delt_fly'],
    customizationStatus: 'customized',
    accessoryAdditionCount: 2,
  })

  const firstHandle = movementCard(page, FIRST_ACCESSORY).getByTestId('accessory-drag-handle')
  await firstHandle.focus()
  await page.keyboard.press('Space')
  const dragStatus = page.getByRole('status')
  await expect(dragStatus).toContainText('Draggable item')
  await page.waitForTimeout(100)
  await page.keyboard.press('ArrowDown')
  await expect(dragStatus).toContainText('rear_delt_fly')
  await page.keyboard.press('Space')

  await expect.poll(() => addedMovementNames(page)).toEqual([SECOND_ACCESSORY, FIRST_ACCESSORY])
  await expect(addedMovementCards(page).first().getByTestId('accessory-drag-handle')).toBeEnabled()
  await expect.poll(async () => getAccessoryCustomizationState(DEMO_ACCESSORIES)).toMatchObject({
    movementIds: ['rear_delt_fly', 'overhead_triceps_extension'],
    accessoryAdditionCount: 2,
  })

  await page.reload()
  await showOverview(page)
  expect(await plannedMovementNames(page)).toEqual(originalPlannedMovementNames)
  expect(await addedMovementNames(page)).toEqual([SECOND_ACCESSORY, FIRST_ACCESSORY])

  await removeAddedMovement(page, movementCard(page, SECOND_ACCESSORY), true)
  await expect(movementCard(page, SECOND_ACCESSORY)).toHaveCount(0)
  await expect(movementCard(page, FIRST_ACCESSORY)).toBeVisible()

  await page.reload()
  await showOverview(page)
  await expect(movementCard(page, SECOND_ACCESSORY)).toHaveCount(0)
  await expect(movementCard(page, FIRST_ACCESSORY)).toBeVisible()
  expect(await addedMovementNames(page)).toEqual([FIRST_ACCESSORY])

  await removeAddedMovement(page, movementCard(page, FIRST_ACCESSORY), true)
  await expect.poll(async () => getAccessoryCustomizationState(DEMO_ACCESSORIES)).toMatchObject({
    movementIds: [],
    customizationStatus: 'default',
    accessoryAdditionCount: 0,
  })

  await addSessionAccessory(page, PHASE_ACCESSORY, true)
  await expect.poll(async () => getAccessoryCustomizationState(DEMO_ACCESSORIES)).toMatchObject({
    movementIds: ['face_pull'],
    customizationStatus: 'customized',
    accessoryAdditionCount: 1,
  })

  const phaseCard = movementCard(page, PHASE_ACCESSORY)
  await phaseCard.getByRole('button', { name: 'Remove exercise' }).click()
  const phaseDialog = page.getByRole('dialog', { name: `Remove ${PHASE_ACCESSORY}?` })
  const removeFuture = phaseDialog.getByRole('checkbox', { name: /Also remove from/ })
  await expect(removeFuture).toBeVisible()
  await expect(removeFuture).not.toBeChecked()
  await phaseDialog.getByRole('button', { name: 'Remove exercise' }).click()
  await expect(phaseDialog).toBeHidden()
  await expect(movementCard(page, PHASE_ACCESSORY)).toHaveCount(0)
  await expect.poll(async () => getAccessoryCustomizationState(DEMO_ACCESSORIES)).toMatchObject({
    movementIds: ['face_pull'],
    customizationStatus: 'customized',
    accessoryAdditionCount: 1,
  })

  // The future row still reserves its slot after a current-only removal. Re-adding
  // the same movement must allocate a fresh current-session slot and succeed.
  await addSessionAccessory(page, PHASE_ACCESSORY)
  await removeAddedMovement(page, movementCard(page, PHASE_ACCESSORY))
  await resetAccessoryCustomizationState(DEMO_ACCESSORIES)
  await expect.poll(async () => getAccessoryCustomizationState(DEMO_ACCESSORIES)).toMatchObject({
    movementIds: [],
    customizationStatus: 'default',
    accessoryAdditionCount: 0,
  })

  await addSessionAccessory(page, PHASE_ACCESSORY, true)
  await expect.poll(async () => getAccessoryCustomizationState(DEMO_ACCESSORIES)).toMatchObject({
    movementIds: ['face_pull'],
    customizationStatus: 'customized',
    accessoryAdditionCount: 1,
  })
  await movementCard(page, PHASE_ACCESSORY).getByRole('button', { name: 'Remove exercise' }).click()
  const futureDialog = page.getByRole('dialog', { name: `Remove ${PHASE_ACCESSORY}?` })
  const futureCheckbox = futureDialog.getByRole('checkbox', { name: /Also remove from/ })
  await expect(futureCheckbox).not.toBeChecked()
  await futureCheckbox.check()
  await futureDialog.getByRole('button', { name: 'Remove exercise' }).click()
  await expect(futureDialog).toBeHidden()
  await expect.poll(async () => getAccessoryCustomizationState(DEMO_ACCESSORIES)).toMatchObject({
    movementIds: [],
    customizationStatus: 'default',
    accessoryAdditionCount: 0,
  })
  await expect(movementCard(page, PHASE_ACCESSORY)).toHaveCount(0)
})
