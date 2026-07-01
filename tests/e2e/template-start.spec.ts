import { expect, test } from '@playwright/test'

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
