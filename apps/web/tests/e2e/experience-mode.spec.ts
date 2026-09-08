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
