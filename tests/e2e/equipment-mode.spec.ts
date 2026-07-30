import { expect, test, type Page } from '@playwright/test'
import { login } from './support/auth'

test.use({ storageState: { cookies: [], origins: [] } })

const DEMO_EQUIPMENT = {
  email: 'demo.equipment@sheetless.local',
  password: 'DemoPass123!',
}

async function showSessionOverview(page: Page) {
  const focusView = page.getByTestId('focus-view')
  const addExercise = page.getByTestId('add-exercise')
  await expect
    .poll(
      async () =>
        (await focusView.isVisible().catch(() => false)) ||
        (await addExercise.isVisible().catch(() => false)),
    )
    .toBe(true)
  if (await focusView.isVisible().catch(() => false)) {
    await page.getByTestId('focus-overview').click()
    await expect(focusView).toBeHidden()
  }
  await expect(addExercise).toBeVisible()
}

async function discardActiveWorkout(page: Page) {
  await page.goto('/today')
  const discard = page.getByRole('button', {
    name: 'Discard workout',
    exact: true,
  })
  const plannedWorkout = page.getByRole('button', {
    name: /start workout|start next session/i,
  })
  await expect
    .poll(
      async () =>
        (await discard.isVisible().catch(() => false)) ||
        (await plannedWorkout.isVisible().catch(() => false)),
    )
    .toBe(true)
  if (!(await discard.isVisible())) return
  const dialog = page.getByRole('dialog', { name: 'Discard workout?' })
  await expect(async () => {
    if (await dialog.isVisible().catch(() => false)) return
    await expect(discard).toBeEnabled({ timeout: 2_000 })
    if (await dialog.isVisible().catch(() => false)) return
    await discard.click()
    await expect(dialog).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })
  await dialog
    .getByRole('button', { name: 'Discard workout', exact: true })
    .click()
  await expect(dialog).toBeHidden({ timeout: 20_000 })
}

async function openEquipmentModePreview(page: Page) {
  const changeMode = page.getByRole('button', {
    name: 'Change equipment mode',
  })
  await expect(changeMode).toBeVisible({ timeout: 15_000 })
  const disableDialog = page.getByRole('dialog', {
    name: 'Use all equipment?',
  })
  const enableDialog = page.getByRole('dialog', {
    name: 'Use free weights only?',
  })
  const dialogIsVisible = async () =>
    (await disableDialog.isVisible().catch(() => false)) ||
    (await enableDialog.isVisible().catch(() => false))
  await expect(async () => {
    if (await dialogIsVisible()) return
    await expect(changeMode).toBeEnabled({ timeout: 2_000 })
    if (await dialogIsVisible()) return
    await changeMode.click()
    await expect
      .poll(
        dialogIsVisible,
        { timeout: 3_000 },
      )
      .toBe(true)
  }).toPass({ timeout: 20_000 })
  return { disableDialog, enableDialog }
}

async function restoreAllEquipment(page: Page) {
  await discardActiveWorkout(page)
  await page.goto('/program')
  const { disableDialog, enableDialog } =
    await openEquipmentModePreview(page)
  if (await disableDialog.isVisible()) {
    await disableDialog
      .getByRole('button', { name: 'Use all equipment', exact: true })
      .click()
    await expect(disableDialog).toBeHidden({ timeout: 20_000 })
    return
  }
  await enableDialog
    .getByRole('button', { name: 'Cancel', exact: true })
    .click()
  await expect(enableDialog).toBeHidden()
}

test('programme conversion is frozen into a live free-weight workout', async ({
  page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) < 768,
    'Stateful equipment-mode flow runs once on desktop',
  )
  test.setTimeout(180_000)
  await login(page, DEMO_EQUIPMENT)

  try {
    await page.goto('/program')
    const { enableDialog: conversion } =
      await openEquipmentModePreview(page)
    await expect(conversion).toBeVisible({ timeout: 15_000 })
    await expect(conversion).toContainText('Replacement loads start blank')
    await expect(
      conversion.getByText('Back Extension', { exact: true }).first(),
    ).toBeVisible()
    await expect(
      conversion
        .getByText('45-Degree Back Extension', { exact: true })
        .first(),
    ).toBeVisible()
    await conversion
      .getByRole('button', {
        name: 'Use free weights only',
        exact: true,
      })
      .click()
    await expect(conversion).toBeHidden({ timeout: 20_000 })

    await page.goto('/today')
    await expect(
      page.getByText('Free weights only', { exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 })
    const start = page.getByRole('button', {
      name: /start workout|start next session/i,
    })
    const starting = page.getByRole('button', {
      name: 'Starting...',
      exact: true,
    })
    const startWasHandled = async () =>
      /\/sessions\/[^/]+$/.test(page.url()) ||
      (await starting.isVisible().catch(() => false))
    await expect(async () => {
      if (await startWasHandled()) return
      await expect(start).toBeEnabled({ timeout: 2_000 })
      if (await startWasHandled()) return
      await start.click()
      await expect
        .poll(startWasHandled, { timeout: 2_000 })
        .toBe(true)
    }).toPass({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, {
      timeout: 20_000,
    })
    const liveTitleRow = page
      .getByRole('heading', { name: 'Day 1', exact: true, level: 1 })
      .locator('..')
    await expect(
      liveTitleRow.getByText('Free weights only', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: '45-Degree Back Extension',
        exact: true,
      }),
    ).toBeVisible()

    await showSessionOverview(page)
    await page.getByTestId('add-exercise').click()
    const addDialog = page.getByRole('dialog', { name: 'Add accessory' })
    await addDialog
      .getByPlaceholder('Search accessory movements')
      .fill('Lat Pulldown')
    await expect(
      addDialog.getByText('No matching accessory movements found.'),
    ).toBeVisible()
    await addDialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click()

    const swappableMovement = page.getByRole('button', {
      name: /Chin-Up accessory/,
    })
    await expect(swappableMovement).toBeVisible()
    await swappableMovement.click()
    const swap = page.getByRole('button', {
      name: 'Swap movement',
      exact: true,
    })
    await expect(swap).toBeVisible()
    await swap.click()
    const swapDialog = page.getByRole('dialog', { name: 'Swap movement' })
    await swapDialog
      .getByPlaceholder('Search alternatives')
      .fill('Lat Pulldown')
    await expect(
      swapDialog.getByText('No matching movements found.'),
    ).toBeVisible()
    await expect(
      swapDialog.getByRole('button', { name: 'Swap', exact: true }),
    ).toBeDisabled()
    await swapDialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click()

    await page.goto('/today')
    await expect(
      page.getByText('Free weights only', { exact: true }).first(),
    ).toBeVisible()
    await page.goto('/program')
    const blockedControl = page.getByRole('button', {
      name: 'Change equipment mode',
    })
    await expect(blockedControl).toBeDisabled()
    await expect(
      page.getByText('Finish or discard the current workout to change this.'),
    ).toBeVisible()
  } finally {
    await restoreAllEquipment(page)
  }
})
