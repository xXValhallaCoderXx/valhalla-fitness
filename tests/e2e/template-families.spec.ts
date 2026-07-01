import { expect, test } from '@playwright/test'

// Programme families: the catalogue collapses same-family variants into one card, and the start
// page offers a schedule/variant selector. Uses the authenticated demo session from auth.setup.ts,
// so it needs Docker + local Supabase running and a seeded demo user
// (`pnpm exec supabase start` && `pnpm demo:seed`).

test('catalogue collapses same-family variants into a single card', async ({ page }) => {
  await page.goto('/templates')

  // The Powerbuilding family (U/L + PPL) renders as one card with a schedule hint…
  await expect(page.getByRole('heading', { name: 'Powerbuilding' })).toBeVisible()
  await expect(page.getByText(/Choose your schedule/i).first()).toBeVisible()

  // …not as separate cards per variant. The individual variant name is a schedule *inside* the
  // family, so it must not appear as its own catalogue card heading.
  await expect(page.getByRole('heading', { name: 'Power + Hypertrophy PPL' })).toHaveCount(0)
})

test('start page switches schedule variant and swaps the programme structure', async ({ page }) => {
  await page.goto('/templates/power_hypertrophy_ul/start')

  // The 4-day U/L variant loads by default.
  await expect(page.getByRole('heading', { name: 'Power + Hypertrophy U/L' })).toBeVisible()
  await expect(page.getByText(/Choose your schedule/i)).toBeVisible()

  // Toggle to the 5-day PPL variant (retry past the SSR hydration race where an early click no-ops).
  await expect(async () => {
    await page.getByText(/5 days.*PPL/i).click()
    await expect(page).toHaveURL(/variant=power_hypertrophy_ppl_5day/, { timeout: 1500 })
  }).toPass({ timeout: 15000 })

  // The header + schedule now reflect the 5-day programme.
  await expect(page.getByRole('heading', { name: 'Power + Hypertrophy PPL' })).toBeVisible()
  await expect(page.getByText('5 days/wk').first()).toBeVisible()
})

test("a card's info button explains the methodology", async ({ page }) => {
  await page.goto('/templates')

  // Tap the Powerbuilding card's info icon → a plain-English methodology popover (retry past the
  // SSR hydration race where an early click no-ops).
  await expect(async () => {
    await page.getByRole('button', { name: 'How Powerbuilding works' }).click()
    await expect(page.getByText(/pairs heavy, low-rep work/i)).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
})

test('level + goal filters narrow the catalogue', async ({ page }) => {
  await page.goto('/templates')
  await expect(page.getByRole('heading', { name: 'Powerbuilding' })).toBeVisible()

  // Filtering to Beginner drops the all-Intermediate Powerbuilding family; the beginner family stays.
  await expect(async () => {
    await page.getByRole('button', { name: 'Beginner', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Powerbuilding' })).toHaveCount(0, { timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: 'Beginner Linear Strength' })).toBeVisible()
})
