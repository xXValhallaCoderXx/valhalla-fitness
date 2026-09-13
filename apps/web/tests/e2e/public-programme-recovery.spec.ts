import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

async function openFinder(page: Page) {
  await expect(async () => {
    await page.getByRole('button', { name: 'Find my plan', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
  return page.getByRole('dialog')
}

async function answerFinder(dialog: Locator) {
  await dialog.getByRole('button', { name: 'New to lifting' }).click()
  await dialog.getByRole('button', { name: '2–3 days' }).click()
  await dialog.getByRole('button', { name: 'Keep it simple' }).click()
}

async function expectAnswers(dialog: Locator) {
  for (const answer of ['New to lifting', '2–3 days', 'Keep it simple']) {
    await expect(dialog.getByRole('button', { name: answer, exact: true })).toBeVisible()
  }
}

async function showWeek(dialog: Locator) {
  const expand = dialog.getByRole('button', { name: "See what's inside" })
  if (await expand.isVisible()) await expand.click()
}

test('a public catalogue failure is visible on the landing page and retries without losing finder answers', async ({ page }, testInfo) => {
  let unavailable = true
  let blocked = 0
  await page.route('**/_serverFn/**', async (route) => {
    const request = route.request()
    // The public landing page's catalogue GET has no input; week previews carry templateId.
    if (unavailable && request.method() === 'GET' && !new URL(request.url()).searchParams.has('payload')) {
      blocked++
      return route.abort('failed')
    }
    await route.continue()
  })
  await page.goto('/')
  const dialog = await openFinder(page)
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  const landingError = page.locator('#programs').getByRole('alert')
  await expect(landingError).toContainText("We couldn't load the programme library.")
  await expect(landingError.getByRole('button', { name: 'Retry programmes' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('public-catalogue-error.png'), fullPage: true })

  await openFinder(page)
  await answerFinder(dialog)
  await expect(dialog.getByRole('alert')).toContainText('Your answers are saved here.')
  await expectAnswers(dialog)
  expect(blocked).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('finder-catalogue-error.png'), fullPage: true })

  unavailable = false
  await dialog.getByRole('button', { name: 'Retry programmes', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Beginner Linear Strength', exact: true })).toBeVisible()
  await expectAnswers(dialog)
  await showWeek(dialog)
  await expect(dialog.getByText(/^Squat, Bench Press, Barbell Row/).first()).toBeVisible()
  await expect(landingError).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('finder-catalogue-recovered.png'), fullPage: true })
})

test('a public week preview retries in place with the selected recommendation intact', async ({ page }, testInfo) => {
  let unavailable = true
  let blocked = 0
  await page.route('**/_serverFn/**', async (route) => {
    const request = route.request()
    const payload = new URL(request.url()).searchParams.get('payload')
    if (unavailable && request.method() === 'GET' && payload?.includes('"templateId"')) {
      blocked++
      return route.abort('failed')
    }
    await route.continue()
  })
  await page.goto('/')
  const dialog = await openFinder(page)
  await answerFinder(dialog)
  const recommendation = dialog.getByRole('heading', { name: 'Beginner Linear Strength', exact: true })
  await expect(recommendation).toBeVisible()
  await showWeek(dialog)
  await expect(dialog.getByRole('alert')).toContainText("We couldn't load this week's preview.")
  expect(blocked).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('public-preview-error.png'), fullPage: true })

  unavailable = false
  await dialog.getByRole('button', { name: 'Retry preview', exact: true }).click()
  await expect(dialog.getByText(/^Squat, Bench Press, Barbell Row/).first()).toBeVisible()
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  await expect(recommendation).toBeVisible()
  await expectAnswers(dialog)
  await page.screenshot({ path: testInfo.outputPath('public-preview-recovered.png'), fullPage: true })
})
