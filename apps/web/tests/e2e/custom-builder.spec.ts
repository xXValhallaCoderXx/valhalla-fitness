import { expect, test } from '@playwright/test'

/**
 * The builder moved from a modal to `/templates/new` in the 06 revamp. Uses the shared
 * authenticated session from auth.setup.ts.
 *
 * Deliberately stops short of pressing Create: a created template stays in the account's catalogue
 * with no cleanup path, so repeated runs would accumulate programmes and shift the counts that
 * template-families.spec asserts. Everything up to the enabled Create button is covered here; the
 * creation path itself is covered by the domain tests around
 * `buildCustomProgramTemplateDefinition`.
 */
test('Programmes opens the builder as a page, and the wizard reaches Review', async ({ page }) => {
  await page.goto('/templates')

  const create = page.getByRole('button', { name: /^Create( programme)?$/ }).filter({ visible: true }).first()
  await expect(async () => {
    await create.click()
    await expect(page).toHaveURL(/\/templates\/new$/, { timeout: 1500 })
  }).toPass({ timeout: 15000 })

  await expect(page.getByRole('heading', { name: /Build your own programme/i })).toBeVisible({ timeout: 15000 })

  // Walk the wizard to the end. The forward button names its destination.
  for (let step = 0; step < 3; step += 1) {
    const forward = page.getByRole('button', { name: /^Continue to /i }).filter({ visible: true }).first()
    if (!(await forward.count())) break
    await expect(async () => {
      await forward.click()
      await expect(page.getByRole('button', { name: /^Back$/ }).first()).toBeEnabled({ timeout: 2000 })
    }).toPass({ timeout: 20000 })
  }

  await expect(page.getByRole('button', { name: 'Create programme' })).toBeEnabled({ timeout: 15000 })
})

test('the builder says what the programme will do, in both modes', async ({ page }) => {
  await page.goto('/templates/new')
  await expect(page.getByRole('heading', { name: /Build your own programme/i })).toBeVisible({ timeout: 15000 })

  // Present regardless of reading mode — the rules are the point of the screen.
  await expect(page.getByText('What Sheetless will do')).toBeVisible()
  await expect(page.getByText('Your week')).toBeVisible()
})
