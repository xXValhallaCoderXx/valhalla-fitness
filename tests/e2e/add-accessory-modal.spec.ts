import { expect, test, type Locator, type Page } from '@playwright/test'

async function enterProgrammedSessionOverview(page: Page) {
  await page.goto('/today')
  const resume = page.getByRole('button', { name: /resume workout|resume session/i }).first()
  await expect(resume).toBeVisible({ timeout: 15000 })
  await expect(async () => {
    await resume.click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+/, { timeout: 2000 })
  }).toPass({ timeout: 20000 })

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

async function expectNoHorizontalOverflow(locator: Locator) {
  const dimensions = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
}

async function expectWithinHorizontalViewport(locator: Locator, viewportWidth: number) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(-1)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 1)
}

test('add accessory modal stays within the mobile viewport', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768, 'Mobile-only regression')
  test.setTimeout(60_000)
  await enterProgrammedSessionOverview(page)

  await page.getByTestId('add-exercise').click()
  const modal = page.getByRole('dialog', { name: 'Add accessory' })
  const modalBody = page.getByTestId('add-accessory-modal-body')
  await expect(modal).toBeVisible()

  const search = modal.getByPlaceholder('Search accessory movements')
  await expect(search).toBeVisible({ timeout: 15000 })
  await search.fill('Overhead Triceps Extension')
  await modal.getByRole('button', { name: /Overhead Triceps Extension/ }).click()

  const method = modal.getByRole('combobox', { name: 'Method' })
  await expect(async () => {
    await method.click()
    await expect(page.getByRole('option', { name: 'Double progression' })).toBeVisible({ timeout: 1000 })
    await method.press('ArrowDown')
    await method.press('Enter')
    await expect(method).toHaveValue('Double progression', { timeout: 1000 })
  }).toPass({ timeout: 15_000 })
  await expect(modal.getByText(/keeps the load the same until all sets reach the max reps/)).toBeVisible()

  const viewportWidth = page.viewportSize()!.width
  const documentDimensions = await page.evaluate(() => ({
    body: { clientWidth: document.body.clientWidth, scrollWidth: document.body.scrollWidth },
    document: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    },
  }))

  expect(documentDimensions.document.scrollWidth).toBeLessThanOrEqual(documentDimensions.document.clientWidth + 1)
  expect(documentDimensions.body.scrollWidth).toBeLessThanOrEqual(documentDimensions.body.clientWidth + 1)
  await expectNoHorizontalOverflow(modal)
  await expectNoHorizontalOverflow(modalBody)

  const minimumReps = modal.getByLabel('Minimum reps')
  await minimumReps.scrollIntoViewIfNeeded()
  await expectWithinHorizontalViewport(minimumReps, viewportWidth)
  await expectWithinHorizontalViewport(modal.getByLabel('Maximum reps'), viewportWidth)
  await expectWithinHorizontalViewport(modal.getByRole('button', { name: 'Cancel', exact: true }), viewportWidth)
  await expectWithinHorizontalViewport(modal.getByRole('button', { name: 'Add', exact: true }), viewportWidth)
})
