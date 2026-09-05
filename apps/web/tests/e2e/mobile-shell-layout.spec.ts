import { expect, test, type Locator, type Page } from '@playwright/test'

const SYNTHETIC_SAFE_BOTTOM = 32

const isPhoneViewport = (page: Page) => (page.viewportSize()?.width ?? 0) < 768

async function rect(locator: Locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect()
    return {
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      left: box.left,
      width: box.width,
      height: box.height,
    }
  })
}

async function setSyntheticSafeArea(page: Page) {
  await page.evaluate((safeBottom) => {
    document.documentElement.style.setProperty('--vf-safe-bottom-max', `${safeBottom}px`)
  }, SYNTHETIC_SAFE_BOTTOM)
}

test('mobile shell keeps its header, action bar, and navigation inside the safe viewport', async ({
  page,
}) => {
  test.skip(!isPhoneViewport(page), 'Mobile shell geometry is covered by the phone project')

  await page.goto('/templates/bromley-bullmastiff/start')
  await setSyntheticSafeArea(page)

  const shell = page.getByTestId('app-shell')
  const header = page.getByTestId('app-header')
  const scrollRegion = page.getByTestId('app-scroll-region')
  const actionBar = page.getByTestId('route-action-bar')
  const mobileNav = page.getByTestId('mobile-nav')
  const back = page.getByTestId('nested-back')

  await expect(shell).toBeVisible()
  await expect(actionBar).toBeVisible()
  await expect(mobileNav).toBeVisible()
  await expect(back).toBeVisible()

  const viewportHeight = page.viewportSize()!.height
  const shellBox = await rect(shell)
  const actionBox = await rect(actionBar)
  const navBox = await rect(mobileNav)
  const backBox = await rect(back)

  expect(shellBox.top).toBeCloseTo(0, 0)
  expect(shellBox.bottom).toBeCloseTo(viewportHeight, 0)
  expect(navBox.bottom).toBeCloseTo(viewportHeight, 0)
  expect(Math.abs(actionBox.bottom - navBox.top)).toBeLessThanOrEqual(1)
  expect(backBox.width).toBeGreaterThanOrEqual(44)
  expect(backBox.height).toBeGreaterThanOrEqual(44)

  const navLinkBottoms = await mobileNav.evaluate((element) =>
    Array.from(element.querySelectorAll('a')).map(
      (link) => link.getBoundingClientRect().bottom,
    ),
  )
  expect(navLinkBottoms.length).toBeGreaterThan(0)
  for (const bottom of navLinkBottoms) {
    expect(bottom).toBeLessThanOrEqual(viewportHeight - SYNTHETIC_SAFE_BOTTOM + 1)
  }

  const headerBefore = await rect(header)
  const navBefore = await rect(mobileNav)
  const maxScroll = await scrollRegion.evaluate((element) => {
    const available = element.scrollHeight - element.clientHeight
    element.scrollTop = available
    return available
  })
  expect(maxScroll).toBeGreaterThan(0)

  const headerAfter = await rect(header)
  const navAfter = await rect(mobileNav)
  expect(headerAfter.top).toBeCloseTo(headerBefore.top, 0)
  expect(headerAfter.bottom).toBeCloseTo(headerBefore.bottom, 0)
  expect(navAfter.top).toBeCloseTo(navBefore.top, 0)
  expect(navAfter.bottom).toBeCloseTo(navBefore.bottom, 0)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)

  await back.click()
  await expect(page).toHaveURL(/\/templates$/)
})

test('tablet action bar drops the hidden mobile-navigation offset', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chrome',
    'The desktop project supplies the tablet resize once',
  )

  await page.setViewportSize({ width: 820, height: 900 })
  await page.goto('/templates/bromley-bullmastiff/start')
  await setSyntheticSafeArea(page)

  const mobileNav = page.getByTestId('mobile-nav')
  const actionBar = page.getByTestId('route-action-bar')
  const back = page.getByTestId('nested-back')

  await expect(mobileNav).toBeHidden()
  await expect(actionBar).toBeVisible()

  const actionBox = await rect(actionBar)
  const backBox = await rect(back)
  expect(actionBox.bottom).toBeCloseTo(900 - SYNTHETIC_SAFE_BOTTOM, 0)
  expect(backBox.width).toBeGreaterThanOrEqual(44)
  expect(backBox.height).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})
