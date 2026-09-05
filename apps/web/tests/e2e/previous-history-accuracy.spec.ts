import { expect, test, type Page } from '@playwright/test'

async function enterSessionOverview(page: Page) {
  await page.goto('/today')
  const action = page.getByRole('button', {
    name: /resume workout|resume session|start workout|start next session/i,
  })
  await expect(async () => {
    await action.first().click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  const focusView = page.getByTestId('focus-view')
  const movementCards = page.getByTestId('movement-card')
  await expect.poll(async () =>
    await focusView.isVisible().catch(() => false) || await movementCards.count() > 0,
  ).toBe(true)
  if (await focusView.isVisible().catch(() => false)) {
    await expect(async () => {
      await page.getByTestId('focus-overview').click()
      await expect(focusView).toBeHidden({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })
  }
  await expect(movementCards.first()).toBeVisible()
}

function movementCard(page: Page, movementName: string) {
  return page.getByTestId('movement-card').filter({
    has: page.getByRole('heading', { name: movementName, exact: true }),
  })
}

async function openMovementCard(page: Page, movementName: string) {
  const card = movementCard(page, movementName)
  await expect(card).toBeVisible()
  const historyButton = card.getByRole('button', { name: 'Movement history' })
  if (!await historyButton.isVisible().catch(() => false)) {
    await card.getByRole('button').first().click()
    await expect(historyButton).toBeVisible()
  }
  return card
}

test('active demo shows exact comparable values and literal bodyweight history', async ({
  page,
}, testInfo) => {
  await enterSessionOverview(page)

  const squat = await openMovementCard(page, 'Squat')
  await expect(squat.getByText('Previous comparable', { exact: true })).toBeVisible()
  await expect(squat.getByText('75 kg × 5', { exact: true })).toBeVisible()

  const bench = await openMovementCard(page, 'Bench Press')
  await expect(bench.getByText('45 kg × 5', { exact: true })).toBeVisible()

  const chinUp = await openMovementCard(page, 'Chin Up')
  await expect(chinUp.getByText('BW × 10', { exact: true })).toBeVisible()
  await chinUp.getByRole('button', { name: 'Movement history' }).click()

  const history = page.getByRole('dialog', { name: 'Chin-Up history' })
  await expect(history).toBeVisible()
  await expect(history.getByTestId('movement-history-entry').first()).toBeVisible()
  await expect(history.getByText(/Bodyweight ×/).first()).toBeVisible()
  await expect(history.getByText(/40 kg/)).toHaveCount(0)

  await history.screenshot({
    path: `test-results/previous-history-${testInfo.project.name}.png`,
  })
})

test('session history keeps the scheduled day primary for an overnight workout', async ({
  page,
}) => {
  await page.goto('/history?tab=sessions')

  const overnightSession = page
    .getByRole('button')
    .filter({ hasText: 'Extra bench day' })
    .filter({ hasText: 'Yesterday' })
  await expect(overnightSession).toHaveCount(1)
  await expect(overnightSession).toContainText(
    /Completed [A-Z][a-z]{2} \d{1,2}, \d{4} at 12:15 AM GMT\+8/,
  )

  const scheduledDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const scheduledLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    month: 'short',
    day: 'numeric',
  }).format(scheduledDate)
  await expect(overnightSession.getByText(scheduledLabel, { exact: true })).toBeVisible()
})
