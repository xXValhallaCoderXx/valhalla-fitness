import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useMe } from '../src/lib/account'
import { SheetlessThemeProvider, useSheetlessTheme } from '../src/lib/theme-provider'

const profileRead = vi.hoisted(() => vi.fn())
vi.mock('@sheetless/data/account/profile', () => ({ getMe: profileRead }))
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({}) }))
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ user: { id: 'account-a' } }) }))

const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
afterEach(() => client.clear())

it('keeps the navigator ready during profile retry after a cold lookup failure', async () => {
  let rejectLookup!: (error: Error) => void
  let resolveRetry!: (profile: { id: string; themePreference: string }) => void
  profileRead.mockImplementationOnce(() => new Promise((_, reject) => { rejectLookup = reject }))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve }))
  const { result } = renderHook(() => ({ profile: useMe(), theme: useSheetlessTheme() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <SheetlessThemeProvider>{children}</SheetlessThemeProvider>
      </QueryClientProvider>
    ),
  })

  expect(result.current.theme.isThemeReady).toBe(false)
  await act(async () => rejectLookup(new Error('Profile unavailable')))
  await waitFor(() => expect(result.current.profile.isError).toBe(true))
  expect(result.current.theme.isThemeReady).toBe(true)

  await act(async () => { void result.current.profile.refetch() })
  await waitFor(() => expect(result.current.profile.isPending).toBe(true))
  expect(result.current.theme.isThemeReady).toBe(true)

  await act(async () => resolveRetry({ id: 'account-a', themePreference: 'dark' }))
  await waitFor(() => expect(result.current.profile.isSuccess).toBe(true))
  expect(result.current.theme.isThemeReady).toBe(true)
  expect(result.current.theme.effectiveScheme).toBe('dark')
  expect(profileRead).toHaveBeenCalledTimes(2)
})
