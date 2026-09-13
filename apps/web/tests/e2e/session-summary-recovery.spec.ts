import { expect, test, type Page, type Route } from '@playwright/test'
import { login } from './support/auth'
import { createSessionReceiptFixture } from './support/session-receipt-fixture'

test.use({ storageState: { cookies: [], origins: [] } })

function watchForLogger() {
  const state = window as typeof window & { endedLoggerMounted: boolean }
  state.endedLoggerMounted = false
  new MutationObserver(() => {
    if (document.querySelector('[data-testid="focus-log-set"], [data-tour="live-finish"], [aria-label^="Complete set "]')) {
      state.endedLoggerMounted = true
    }
  }).observe(document, { childList: true, subtree: true })
}
async function noLogger(page: Page) {
  expect(await page.evaluate(() => (window as typeof window & { endedLoggerMounted: boolean }).endedLoggerMounted)).toBe(false)
  await expect(page.getByTestId('focus-log-set')).toHaveCount(0)
  await expect(page.locator('[data-tour="live-finish"]')).toHaveCount(0)
}

for (const resolution of ['mixed', 'all'] as const) {
  test(`${resolution} summary decisions survive navigation, reload and read recovery`, async ({ page }, testInfo) => {
    test.setTimeout(120000)
    page.setDefaultTimeout(10000)
    const fixture = await createSessionReceiptFixture()
    const liveUrl = `/sessions/${fixture.sessionId}`
    const summaryUrl = `${liveUrl}/summary`
    const sessionReadPaths = new Set<string>()
    let summaryReadPath = ''
    let watchingSummary = false
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('request', (request) => {
      if (request.method() !== 'GET' || !request.url().includes('_serverFn/') || !request.url().includes(fixture.sessionId)) return
      const pathname = new URL(request.url()).pathname
      if (!watchingSummary) sessionReadPaths.add(pathname)
      else if (!sessionReadPaths.has(pathname)) summaryReadPath = pathname
    })
    try {
      await login(page, fixture.credentials)
      await page.goto(liveUrl, { waitUntil: 'commit' })
      await expect(page.locator('[data-testid="focus-log-set"], [data-tour="live-finish"]').first()).toBeAttached()
      if (resolution === 'mixed') {
        await page.getByTestId('nested-back').click()
        await expect(page).toHaveURL(/\/today$/)
      }
      const summary = await fixture.finish()
      expect(summary.decisionReceiptAvailable).toBe(true)
      expect(summary.decisions.length).toBeGreaterThanOrEqual(3)
      watchingSummary = true
      await page.addInitScript(watchForLogger)
      if (resolution === 'mixed') {
        await page.evaluate(watchForLogger)
        await page.getByRole('button', { name: /resume workout/i }).click()
      } else {
        await page.reload()
      }
      await expect(page).toHaveURL(new RegExp(`${summaryUrl}$`))
      await expect(page.getByRole('heading', { name: /load updates? ready/ })).toBeVisible()
      await noLogger(page)
      if (resolution === 'mixed') {
        // The live URL was replaced: Back reaches Today without revisiting a logger.
        await page.goBack()
        await expect(page).toHaveURL(/\/today$/)
        await page.goForward()
        await expect(page).toHaveURL(new RegExp(`${summaryUrl}$`))
        await expect(page.getByRole('heading', { name: /load updates? ready/ })).toBeVisible()
      }

      const expectedStatuses = new Map(summary.decisions.map((decision) => [decision.id, 'accepted']))
      if (resolution === 'mixed') {
        const boundDecisions = summary.decisions.filter((decision) => decision.stateKey)
        expect(boundDecisions.length).toBeGreaterThanOrEqual(2)
        const [applied, kept] = boundDecisions
        await page.getByRole('button', { name: `Apply ${applied.movementName}`, exact: true }).click()
        await expect(page.getByText('Applied', { exact: true })).toBeVisible()
        await page.getByRole('button', { name: 'Review each instead', exact: true }).click()
        const review = page.getByRole('dialog')
        await expect(review.getByRole('heading', { name: 'Progression review', exact: true })).toBeVisible()
        const keepRow = review.locator('div').filter({
          has: page.getByText(kept.movementName, { exact: true }),
        }).filter({ has: page.getByRole('button', { name: /^Keep / }) }).last()
        let responseLost = false
        const loseCommittedResponse = async (route: Route) => {
          const request = route.request()
          const fields = request.method() === 'POST' ? request.postDataJSON()?.t?.p?.v?.[0]?.p : null
          const values = fields?.k ? Object.fromEntries(fields.k.map((key: string, index: number) => [key, fields.v[index]?.s])) : null
          if (!responseLost && values?.decisionId === kept.id && values.action === 'dismissed') {
            responseLost = true
            await route.fetch()
            await expect.poll(async () => (await fixture.receipts()).find((receipt) => receipt.id === kept.id)?.status)
              .toBe('dismissed')
            return route.abort('failed')
          }
          await route.continue()
        }
        await page.route('**/_serverFn/**', loseCommittedResponse)
        await keepRow.getByRole('button', { name: /^Keep / }).click()
        // The authoritative receipt refresh must resolve the still-open modal,
        // even though its own mutation never received a successful response.
        await expect(review.getByText('Kept', { exact: true })).toBeVisible()
        expect(responseLost).toBe(true)
        const reviewedRow = review.locator('div').filter({
          has: page.getByText(kept.movementName, { exact: true }),
        }).filter({ has: page.getByText('Kept', { exact: true }) }).last()
        await expect(reviewedRow.getByRole('button', { name: /^Accept|^Keep / })).toHaveCount(0)
        await page.screenshot({ path: testInfo.outputPath('lost-response-open-review.png'), fullPage: true })
        await page.unroute('**/_serverFn/**', loseCommittedResponse)
        await review.getByRole('button', { name: 'Decide later', exact: true }).click()
        await expect(review).toBeHidden()
        await expect(page.getByText('Kept', { exact: true })).toBeVisible()
        expectedStatuses.set(kept.id, 'dismissed')
      }
      await page.getByRole('button', { name: /^Apply all \d+ & finish$/ }).filter({ visible: true }).click()
      await expect(page.getByRole('heading', { name: 'Updates applied', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: /^Apply / })).toHaveCount(0)
      await expect.poll(async () => (await fixture.receipts()).map((row) => [row.id, row.status]))
        .toEqual([...expectedStatuses].sort(([left], [right]) => left.localeCompare(right)))

      const assertResolved = async () => {
        await expect(page.getByRole('heading', { name: 'Updates applied', exact: true })).toBeVisible()
        await expect(page.getByRole('heading', { name: /load updates? ready/ })).toHaveCount(0)
        await expect(page.getByRole('button', { name: /^Apply / })).toHaveCount(0)
        await expect(page.getByText(/^Applied: /).first()).toBeVisible()
        if (resolution === 'mixed') await expect(page.getByText(/^Kept at /)).toBeVisible()
        await noLogger(page)
      }
      await assertResolved()
      await page.getByTestId('nested-back').click()
      await expect(page).toHaveURL(/\/today$/)
      await page.goBack()
      await assertResolved()
      await page.reload()
      await assertResolved()
      await page.goto(liveUrl, { waitUntil: 'commit' })
      await expect(page).toHaveURL(new RegExp(`${summaryUrl}$`))
      await assertResolved()
      await page.screenshot({ path: testInfo.outputPath(`${resolution}-resolved.png`), fullPage: true })

      expect(summaryReadPath).not.toBe('')
      const readPattern = `**${summaryReadPath}*`
      await page.route(readPattern, (route) => route.abort('failed'))
      await page.goto(summaryUrl)
      await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible({ timeout: 20000 })
      await expect(page.getByRole('heading', { name: /Updates applied|Workout saved/ })).toHaveCount(0)
      await expect(page.getByText('Applied', { exact: true })).toHaveCount(0)
      await expect(page.getByText('Kept', { exact: true })).toHaveCount(0)
      await page.unroute(readPattern)
      await page.getByRole('button', { name: 'Retry', exact: true }).click()
      await assertResolved()
      const receipts = await fixture.receipts()
      const values = await fixture.stateValues()
      // Accessory advice has no programme state key; its durable result is the
      // receipt status already checked above. Bound lift decisions change loads.
      const stateReceipts = receipts.filter((receipt) => receipt.state_key !== null)
      expect(stateReceipts.length).toBeGreaterThan(0)
      for (const receipt of stateReceipts) {
        const expected = receipt.status === 'accepted' ? receipt.recommended_value : receipt.previous_value
        expect(values.find((value) => value.key === receipt.state_key)?.value).toBe(expected)
      }
      expect(pageErrors).toEqual([])
      await testInfo.attach('durable-receipts', { body: JSON.stringify({ receipts, values }), contentType: 'application/json' })
    } finally {
      await fixture.cleanup()
    }
  })
}
