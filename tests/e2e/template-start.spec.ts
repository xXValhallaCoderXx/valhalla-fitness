import { expect, test } from '@playwright/test'
import { login } from './support/auth'
import { getUserId } from './support/profile'

// A genuinely-new demo account without strength estimates (seeded by `pnpm demo:seed`).
const DEMO_NEW = { email: 'demo.new@sheetless.local', password: 'DemoPass123!' }

// Programme Overview (template-start) redesign. Uses the authenticated demo session from
// auth.setup.ts, so it needs Docker + local Supabase running and a seeded demo user
// (`pnpm exec supabase start` && `pnpm demo:seed`). `bromley-bullmastiff` is the phased
// "Old School Wave Powerbuilding" template. Assertions target the main column + header so they
// hold on both the desktop and mobile e2e projects.
test('phased programme overview: blocks, phase tabs, and how-it-works', async ({ page }) => {
  await page.goto('/templates/bromley-bullmastiff/start')

  // The block timeline renders above the week plan.
  await expect(page.getByText('Programme blocks')).toBeVisible()

  // Switching to the Peak phase loads its week plan and flags changed rows with an "Updated" chip.
  // (Retry past the SSR hydration race where an early click no-ops.)
  await expect(async () => {
    await page.getByRole('button', { name: 'Peak', exact: true }).click()
    await expect(page.getByText('Updated').first()).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })

  // "How it works" opens the redesigned modal with the regulation breakdown.
  await expect(async () => {
    await page.getByRole('button', { name: 'How it works' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })
  await expect(page.getByRole('dialog').getByText('What Sheetless regulates')).toBeVisible()
})

// Without saved strength estimates the Start CTA is disabled — tapping it must explain why
// (same popover as the Values button) instead of doing nothing.
test('disabled Start explains missing strength estimates on tap', async ({ page }) => {
  // Suppress the Today-page auto tour (user-scoped key) so login lands cleanly.
  await page.addInitScript(
    (id) => window.localStorage.setItem(`sheetless.onboardingTourAutorun.${id}`, '1'),
    await getUserId(DEMO_NEW),
  )
  await login(page, DEMO_NEW)
  await page.goto('/templates/bromley-bullmastiff/start')

  // Responsive CTA label: compact "Start" in the mobile sticky footer, "Start programme" desktop.
  const startCta = (page.viewportSize()?.width ?? 1280) < 1024 ? 'Start' : 'Start programme'
  const startButton = page.getByRole('button', { name: startCta, exact: true })
  await expect(startButton).toBeDisabled()

  // The disabled button swallows pointer events; its wrapper span is the popover target.
  // "Open Strength Estimates" is an anchor styled as a button, hence role "link".
  await expect(async () => {
    await startButton.locator('..').click()
    await expect(page.getByRole('link', { name: 'Open Strength Estimates' })).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
})
