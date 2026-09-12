import { expect, test } from '@playwright/test'
import { DEMO_USER } from './support/auth'
import { signInClient } from './support/profile'
import { calendarDateInTimeZone } from '@sheetless/domain/shared/calendar-date'

// These scenarios use the local demo account; restore its measurements and units after each run.
test('Overview refreshes actual measurements after log, replace, delete, and unit changes', async ({ page }) => {
  const { client, userId } = await signInClient(DEMO_USER)
  const { data: profile } = await client.from('profiles').select('units, timezone').eq('id', userId).single().throwOnError()
  const today = calendarDateInTimeZone(new Date(), profile!.timezone)
  const todayLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${today}T00:00:00Z`))
  const { data: existing } = await client.from('bodyweight_entries').select('*').eq('user_id', userId).eq('recorded_on', today).throwOnError()
  try {
    await client.from('profiles').update({ units: 'kg' }).eq('id', userId).throwOnError()
    await page.goto('/history')
    const card = page.getByTestId('bodyweight-trend')
    await expect(card.getByText('Bodyweight', { exact: true })).toBeVisible()
    for (const weight of ['83.2', '84.4']) {
      await card.getByRole('link', { name: 'Log bodyweight' }).click()
      const input = page.getByLabel('Bodyweight in kg')
      await expect(async () => {
        await input.fill(weight)
        await expect(page.getByRole('button', { name: 'Log weight', exact: true })).toBeEnabled({ timeout: 1000 })
      }).toPass({ timeout: 15000 })
      await page.getByRole('button', { name: 'Log weight', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Log weight', exact: true })).toBeDisabled()
      await page.getByRole('link', { name: 'Insights', exact: true }).filter({ visible: true }).first().click()
      await expect(card.getByText(`${weight} kg`, { exact: true })).toBeVisible()
      await expect(card.getByText(`Latest recorded · ${today}`)).toBeVisible()
    }
    await card.getByRole('link', { name: 'Log bodyweight' }).click()
    await page.getByRole('button', { name: `Delete bodyweight entry from ${todayLabel}` }).click()
    await expect(page.getByRole('button', { name: `Delete bodyweight entry from ${todayLabel}` })).toHaveCount(0)
    await page.getByRole('link', { name: 'Insights', exact: true }).filter({ visible: true }).first().click()
    await expect(card.getByText(`Latest recorded · ${today}`, { exact: true })).toHaveCount(0)
    await card.getByRole('link', { name: 'Log bodyweight' }).click()
    await page.getByText('lb', { exact: true }).click()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)
    await page.getByRole('link', { name: 'Insights', exact: true }).filter({ visible: true }).first().click()
    await expect(card.getByText(/lb$/).first()).toBeVisible()
    await expect(async () => {
      await page.getByText('All', { exact: true }).first().click()
      await expect(card.getByText(/measurements in range/)).toBeVisible()
    }).toPass()
  } finally {
    await client.from('profiles').update({ units: profile!.units }).eq('id', userId).throwOnError()
    await client.from('bodyweight_entries').delete().eq('user_id', userId).eq('recorded_on', today).throwOnError()
    if (existing?.length) await client.from('bodyweight_entries').insert(existing).throwOnError()
  }
})
