import { expect, test, type Page } from '@playwright/test'
import { login } from './support/auth'
import { setReadingMode } from './support/profile'

// Drives its own seeded account. This spec writes server flags and needs 8+ completed sessions
// for the Full-mode offer; demo.wave has 10 and an active programme. Staying off the shared
// demo.linear session also keeps it clear of login.spec's explicit-logout test, which revokes
// that session for whatever runs after it.
test.use({ storageState: { cookies: [], origins: [] } })

const DEMO_WAVE = { email: 'demo.wave@sheetless.local', password: 'DemoPass123!' }

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024

test.describe('reading mode', () => {
  test('the Full-mode offer appears once on Today and never returns', async ({ page }) => {
    // Asserts one specific value of a server flag it also mutates, so it runs on a single
    // project — the desktop and mobile projects would otherwise race through the same account.
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'server-flag mutation: desktop project only')

    await setReadingMode(DEMO_WAVE, 'guided', { hintDismissed: false })
    await login(page, DEMO_WAVE)

    const hint = page.getByTestId('full-mode-hint')
    await expect(hint).toBeVisible({ timeout: 15000 })
    await expect(hint).toContainText('Full mode is ready')

    // The card is server-rendered behind two queries; retry until the dismissal lands.
    await expect(async () => {
      await hint.getByRole('button', { name: 'Not now' }).click()
      await expect(hint).toBeHidden({ timeout: 1000 })
    }).toPass({ timeout: 15000 })

    // Gone for good — a reload must not bring it back.
    await page.reload()
    await expect(page.getByTestId('today-page-loading')).toBeHidden({ timeout: 15000 })
    await expect(hint).toBeHidden()
  })

  test('Settings switches the mode and Plan changes vocabulary with it', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'server-flag mutation: desktop project only')

    await setReadingMode(DEMO_WAVE, 'guided', { hintDismissed: true })
    await login(page, DEMO_WAVE)
    await page.goto('/settings')

    const control = page.getByTestId('experience-mode-control')
    await expect(control).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Plain words.', { exact: false })).toBeVisible()

    await expect(async () => {
      await control.getByText('Full', { exact: true }).click()
      await expect(page.getByText('Technical notation.', { exact: false })).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 15000 })

    // The rail badge reflects the saved mode on desktop.
    if (isDesktop(page)) {
      await expect(page.getByTestId('sidebar-mode-badge')).toContainText('Full')
    }

    // Plan renames the reference table rather than showing different numbers. `exact` matters:
    // the surrounding prose also mentions training maxes.
    await page.goto('/program')
    await expect(page.getByText('Training maxes', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Your training weights', { exact: true })).toHaveCount(0)

    await setReadingMode(DEMO_WAVE, 'guided')
    await page.goto('/program')
    await expect(page.getByText('Your training weights', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Training maxes', { exact: true })).toHaveCount(0)
  })
})

// Runs on both projects — it is the one test here that must see each viewport. It asserts only
// shell chrome, so it writes no server flags: doing so from a second worker would race the
// desktop-only tests above, which assert specific values of those same flags.
test('the desktop rail replaces the header nav and keeps the mobile bar untouched', async ({ page }) => {
  await login(page, DEMO_WAVE)

  const sidebar = page.getByTestId('app-sidebar')
  const mobileNav = page.getByTestId('mobile-nav')

  if (isDesktop(page)) {
    await expect(sidebar).toBeVisible({ timeout: 15000 })
    await expect(mobileNav).toBeHidden()
    // British copy is the shipped vocabulary, in the rail as everywhere else.
    await expect(sidebar.getByRole('link', { name: 'Programmes' })).toBeVisible()
    await sidebar.getByRole('link', { name: 'Plan' }).click()
    await expect(page).toHaveURL(/\/program$/)
  } else {
    await expect(sidebar).toBeHidden()
    await expect(mobileNav).toBeVisible({ timeout: 15000 })
  }

  // The shell still owns its own scroll at every width.
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

// A thin-data account: 2 completed sessions, so the weekly-volume card has not earned its chart.
const DEMO_THIN = { email: 'demo.accessories@sheetless.local', password: 'DemoPass123!' }

test.describe('insight gating', () => {
  test('Guided locks a card that has not earned its data; Full shows it flagged', async ({ page }) => {
    // Asserts a specific reading mode on a shared account, so one project only.
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'server-flag mutation: desktop project only')

    await setReadingMode(DEMO_THIN, 'guided')
    await login(page, DEMO_THIN)
    await page.goto('/history')

    // The lifecycle chip states how far off the rest of the screen is.
    await expect(page.getByText(/building your baseline · 2 of 8 sessions/i)).toBeVisible({ timeout: 15000 })

    const locked = page.getByTestId('locked-insight-volume_trend')
    await expect(locked).toBeVisible()
    await expect(locked).toContainText('two training weeks')
    await expect(locked).toContainText('1 of 2')
    await expect(page.getByTestId('thin-data-volume_trend')).toHaveCount(0)

    // Full never hides a number — same card, qualified rather than withheld.
    await setReadingMode(DEMO_THIN, 'full')
    await page.goto('/history')
    await expect(page.getByTestId('thin-data-volume_trend')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('locked-insight-volume_trend')).toHaveCount(0)
    // …and it speaks the technical vocabulary while it is there.
    await expect(page.getByText(/weekly tonnage/i)).toBeVisible()

    await setReadingMode(DEMO_THIN, 'guided')
  })
})

test.describe('load trace', () => {
  // Reading-mode assertions on a shared account, so one project only.
  test.beforeEach(({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'server-flag mutation: desktop project only')
  })

  test('Full explains a planned load; the formula agrees with the number on screen', async ({ page }) => {
    await setReadingMode(DEMO_WAVE, 'full', { showFormulas: true })
    await login(page, DEMO_WAVE)

    // The ledger is the selection surface, and Full opens it by default.
    const row = page.getByRole('option', { name: /Deadlift/ }).first()
    await expect(async () => {
      await row.click()
      await expect(page.getByTestId('load-trace-panel')).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 25000 })

    const panel = page.getByTestId('load-trace-panel')
    await expect(panel).toContainText('MROUND')
    await expect(panel).toContainText('TM_deadlift')
    // The projected bands come from the real rule, so all four outcomes are named.
    await expect(panel).toContainText(/double/i)
    await expect(panel).toContainText(/reset/i)

    // The assertion that matters: the trace must explain the load actually shown beside it.
    const target = (await row.innerText()).match(/(\d+(?:\.\d+)?)\s*kg/)?.[1]
    expect(target).toBeTruthy()
    await expect(panel).toContainText(`${target} kg`)
    // A disagreement renders a warning; there must not be one here.
    await expect(panel).not.toContainText('no longer matches')
  })

  test('Guided shows no trace, no selection, and keeps its reading width', async ({ page }) => {
    await setReadingMode(DEMO_WAVE, 'guided')
    await login(page, DEMO_WAVE)

    await expect(page.getByTestId('today-workout')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('load-trace-panel')).toHaveCount(0)
    await expect(page.getByRole('option')).toHaveCount(0)
  })

  // The "no computed load" case (manually added accessories carry no prescription) is covered by
  // packages/domain/tests/load-trace.test.ts. Asserting it here would need an account that has both
  // a manual accessory and a *planned* session, and the accessory account keeps a workout in
  // progress — so the e2e would be testing fixture state, not behaviour.

  test('Plan carries the cycle inspector in Full', async ({ page }) => {
    await setReadingMode(DEMO_WAVE, 'full')
    await login(page, DEMO_WAVE)
    await page.goto('/program')

    const panel = page.getByTestId('cycle-inspector-panel')
    await expect(panel).toBeVisible({ timeout: 15000 })
    await expect(panel).toContainText('Rules in play')
    // Rule ids are printed verbatim — Full is the technical view.
    await expect(panel).toContainText('training_max_band')

    await setReadingMode(DEMO_WAVE, 'guided')
    await page.goto('/program')
    await expect(page.getByTestId('cycle-inspector-panel')).toHaveCount(0)
  })
})

// Lives here rather than in its own file on purpose: these mutate DEMO_WAVE's reading mode, and
// Playwright parallelises by file — a second file setting the same flag would race these.
test.describe('muscle workload', () => {
  // Each Full-mode test hands the account back at the end of its own body, never in afterAll:
  // afterAll is not covered by the desktop-only skip, so the mobile worker — where every test
  // here skips — would fire it immediately and reset the flag under the desktop worker.

  test('Guided names the screen in plain words throughout', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'server-flag mutation: desktop project only')

    await setReadingMode(DEMO_WAVE, 'guided', { hintDismissed: true })
    await login(page, DEMO_WAVE)
    await page.goto('/history?tab=body-load')

    await expect(page.getByRole('tab', { selected: true })).toHaveAccessibleName(/muscles/i, { timeout: 15000 })
    await expect(page.getByText('Recent muscle work')).toBeVisible()
    // The tab and the panel used to disagree — "Muscles" opening onto "Muscle fatigue".
    await expect(page.getByText('Muscle fatigue', { exact: true })).toHaveCount(0)
    await expect(page.getByTestId('load-trace-panel')).toHaveCount(0)
  })

  test('Full traces a muscle back to the sets that loaded it', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'server-flag mutation: desktop project only')

    await setReadingMode(DEMO_WAVE, 'full', { hintDismissed: true, showFormulas: true })
    await login(page, DEMO_WAVE)
    await page.goto('/history?tab=body-load')

    await expect(page.getByRole('tab', { selected: true })).toHaveAccessibleName(/muscle fatigue/i, { timeout: 15000 })

    const trace = page.getByTestId('load-trace-panel')
    const rows = page.getByRole('button').filter({ hasText: /Involved in \d+ set/ })
    await expect(async () => {
      await rows.first().click()
      await expect(trace).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })

    // The divisor turning a score into a percentage is stated nowhere else in the product.
    await expect(trace).toContainText('÷ 12')
    await expect(trace).toContainText('recency')

    await setReadingMode(DEMO_WAVE, 'guided', { hintDismissed: true })
  })

  test('weekly sets shows a week-on-week change, or says why it cannot', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'server-flag mutation: desktop project only')

    await setReadingMode(DEMO_WAVE, 'full', { hintDismissed: true })
    await login(page, DEMO_WAVE)
    await page.goto('/history?tab=body-load')

    // Mantine's SegmentedControl hides the radio input and paints the label, so the label is what
    // a user actually clicks — targeting the input needs force, which would mask a real breakage.
    const weeklySets = page.locator('label').filter({ hasText: /^Weekly sets$/ })
    await expect(async () => {
      await weeklySets.click()
      await expect(page.getByText(/Sets per week/i)).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })

    // A comparison or a stated reason — never a silent column of dashes, which during a deload
    // would read as "no change" when the drop is the whole point.
    await expect(
      page.getByText(
        /Δ vs prior week|No completed week before|during a deload|First week of this programme|Not enough training history/,
      ),
    ).toBeVisible()

    await setReadingMode(DEMO_WAVE, 'guided', { hintDismissed: true })
  })
})
