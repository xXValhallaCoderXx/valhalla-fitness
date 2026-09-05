import { expect, test } from '@playwright/test'

test.describe('public account deletion', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('shows the deletion pathway without an authenticated app shell', async ({ page }) => {
    await page.goto('/account-deletion')

    await expect(page).toHaveURL(/\/account-deletion$/)
    await expect(page.getByRole('heading', { name: 'Delete your Sheetless account' })).toBeVisible()
    await expect(page.getByText('Account deletion pathway')).toBeVisible()
    await expect(page.getByText('Open Settings.')).toBeVisible()
    await expect(page.getByText('Choose Delete account.')).toBeVisible()
    await expect(page.getByText('DELETE MY ACCOUNT', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in to delete account' })).toHaveAttribute('href', '/auth')
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
    await expect(page.getByTestId('app-shell')).toHaveCount(0)
  })
})
