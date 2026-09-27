import { expect, test, type Page } from '@playwright/test'
import { login } from './support/auth'
import { createSessionReceiptFixture } from './support/session-receipt-fixture'

test.use({ storageState: { cookies: [], origins: [] } })

for (const other of ['repeat', 'end'] as const) test(`concurrent Repeat and ${other} resolve one saved cycle`, async () => {
  const fixture = await createSessionReceiptFixture({ structuredBlockEnd: true })
  try {
    await fixture.finish()
    const { results, previousVersion } = await fixture.raceCycleChoices(other)
    const successful = results.filter(result => !result.error)
    expect(successful).toHaveLength(other === 'repeat' ? 2 : 1)
    if (other === 'repeat') expect(successful[0].data).toEqual(successful[1].data)
    else expect(results.find(result => result.error)?.error?.message)
      .toMatch(/CYCLE_NO_LONGER_PENDING|PROGRAM_VERSION_CONFLICT/)
    const state = await fixture.cycleState()
    expect(state.program.state_version).toBe(previousVersion + 1)
    expect(state.program.current_week_index).toBe(16)
    expect(['repeated', 'ended']).toContain(state.boundaries[0].status)
    expect(state.repeats).toHaveLength(state.boundaries[0].status === 'repeated' ? 1 : 0)
    expect(state.sessions.every(session => session.status === 'completed')).toBe(true)
  } finally { await fixture.cleanup() }
})

async function openChoices(page: Page) {
  // A full navigation can expose the server-rendered card before hydration.
  await expect(async () => {
    if (!(await page.getByTestId('cycle-choice-modal').isVisible())) {
      await page.getByRole('button', { name: 'Choose what comes next' }).click()
    }
    await expect(page.getByTestId('cycle-choice-modal')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
}
async function reviewWeights(page: Page, confirmLabel = 'Confirm next cycle') {
  const review = page.getByRole('button', { name: 'Review Apply / Keep', exact: true })
  if (await review.count()) {
    await review.click()
    await page.getByRole('button', { name: /Accept all/ }).click()
    await expect(page.getByText(/All \d+ reviewed/)).toBeVisible()
    await page.getByRole('button', { name: 'Decide later', exact: true }).click()
  }
  await expect(page.getByRole('button', { name: confirmLabel, exact: true })).toBeVisible()
}

test('completed block waits across Today, Plan and recap, then repeats with exact lost-response recovery', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const fixture = await createSessionReceiptFixture({ structuredBlockEnd: true })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    const summary = await fixture.finish()
    expect(summary.cycleBoundary?.status).toBe('pending')
    await login(page, fixture.credentials)
    await page.goto('/today')
    await expect(page.getByRole('heading', { name: 'Cycle complete', exact: true })).toBeVisible()
    await openChoices(page)
    await page.getByRole('button', { name: 'Decide later', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Cycle complete', exact: true })).toBeVisible()
    await page.goto('/program')
    await expect(page.getByRole('heading', { name: 'Cycle complete', exact: true })).toBeVisible()
    await expect(page.getByTestId('program-header')).toContainText('Week 4 of 4')
    await page.goto(`/sessions/${fixture.sessionId}/summary`)
    await openChoices(page)
    await page.getByRole('button', { name: 'Choose another plan', exact: true }).click()
    await expect(page).toHaveURL(/\/templates$/)
    expect((await fixture.cycleState()).boundaries[0].status).toBe('pending')
    await page.goBack()
    await openChoices(page)
    await page.getByRole('button', { name: 'Repeat plan', exact: true }).click()
    await reviewWeights(page)
    await page.screenshot({ path: testInfo.outputPath('reviewed-cycle.png'), fullPage: true })
    let lost = false
    await page.route('**/_serverFn/**', async route => {
      if (!lost && route.request().method() === 'POST' && route.request().postData()?.includes(summary.cycleBoundary!.id)) {
        lost = true
        await route.fetch()
        await expect.poll(async () => (await fixture.cycleState()).boundaries[0].status).toBe('repeated')
        return route.abort('failed')
      }
      await route.continue()
    })
    await page.getByRole('button', { name: 'Confirm next cycle', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Retry saved choice', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Retry saved choice', exact: true }).click()
    await expect(page).toHaveURL(/\/today$/)
    await expect(page.getByRole('heading', { name: 'Cycle complete', exact: true })).toHaveCount(0)
    const state = await fixture.cycleState()
    expect(state.program.current_week_index).toBe(16)
    expect(state.repeats).toHaveLength(1)
    expect(state.sessions.every(session => session.status === 'completed')).toBe(true)
    await page.goto(`/sessions/${fixture.sessionId}/summary`)
    await expect(page.getByText('You chose to continue with another cycle.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Choose what comes next' })).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await testInfo.attach('browser-errors', { body: JSON.stringify(errors), contentType: 'application/json' })
    await fixture.cleanup()
  }
})

test('explicit End clears a waiting cycle and unlocks blank training', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const fixture = await createSessionReceiptFixture({ structuredBlockEnd: true })
  try {
    await fixture.finish()
    await login(page, fixture.credentials)
    await page.goto('/today')
    await openChoices(page)
    await page.getByRole('button', { name: 'End this plan', exact: true }).click()
    await reviewWeights(page, 'Confirm End plan')
    await page.getByRole('button', { name: 'Decide later', exact: true }).click()
    await openChoices(page)
    await page.getByRole('button', { name: 'End this plan', exact: true }).click()
    await page.screenshot({ path: testInfo.outputPath('end-cycle-confirmation.png'), fullPage: true })
    await page.getByRole('button', { name: 'Confirm End plan', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Start a blank workout', exact: true })).toBeVisible()
    expect((await fixture.cycleState()).boundaries[0].status).toBe('ended')
    await page.getByRole('button', { name: 'Start a blank workout', exact: true }).click()
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/)
    expect((await fixture.cycleState()).sessions.filter(session => session.status === 'in_progress')).toHaveLength(1)
  } finally { await fixture.cleanup() }
})
