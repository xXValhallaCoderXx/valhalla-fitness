import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import type { EntrySearchParams } from '../src/lib/entry-destination'
import type { SessionStatus } from '../src/lib/session-provider'
import { themeProviderMock } from './support/theme'

const state = vi.hoisted(() => ({
  status: 'signedIn' as SessionStatus, user: { id: 'account-a' } as User | null,
  pathname: '/', params: {} as EntrySearchParams, focused: true, ready: true, read: vi.fn(),
}))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/session-provider', () => ({ useSession: () => ({ status: state.status, user: state.user }) }))
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({}) }))
vi.mock('@sheetless/data/account/profile', () => ({ getMe: state.read }))
vi.mock('expo-router', () => ({
  usePathname: () => state.pathname,
  useGlobalSearchParams: () => state.params,
  useIsFocused: () => state.focused,
  useRootNavigationState: () => state.ready ? { key: 'root-navigation' } : undefined,
  Redirect: ({ href }: { href: unknown }) => <div data-testid="entry-redirect">{JSON.stringify(href)}</div>,
}))
vi.mock('@/components', () => {
  const Block = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    Screen: Block, Panel: Block, Text: Block,
    Button: ({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) =>
      <button disabled={loading} onClick={onPress}>{label}</button>,
  }
})

import { EntryGate } from '../src/features/onboarding/EntryGate'

let client: QueryClient
const savedProfile = (id = 'account-a', onboardingCompleted = false) => ({ id, onboardingCompleted })
const redirect = () => JSON.parse(screen.getByTestId('entry-redirect').textContent!)
const route = () => <QueryClientProvider client={client}><EntryGate><div>Route content</div></EntryGate></QueryClientProvider>

beforeEach(() => {
  state.status = 'signedIn'
  state.user = { id: 'account-a' } as User
  state.pathname = '/'
  state.params = {}
  state.focused = true
  state.ready = true
  state.read.mockReset().mockResolvedValue(savedProfile())
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
})
afterEach(() => client.clear())

describe('native entry gate', () => {
  it('retains the intended destination before sign-in without mounting protected content', () => {
    state.status = 'signedOut'
    state.user = null
    state.pathname = '/settings'
    state.params = { section: 'starting-numbers', draftId: 'private' }

    render(route())

    expect(redirect()).toEqual({ pathname: '/auth', params: { next: '/settings?section=starting-numbers' } })
    expect(screen.queryByText('Route content')).toBeNull()
    expect(state.read).not.toHaveBeenCalled()
  })

  it('allows signed-out auth only after the root navigator is ready', () => {
    state.status = 'signedOut'
    state.user = null
    state.pathname = '/auth'
    state.ready = false
    const view = render(route())

    expect(screen.queryByTestId('entry-redirect')).toBeNull()
    expect(screen.queryByText('Route content')).toBeNull()
    state.ready = true
    view.rerender(route())
    expect(screen.getByText('Route content')).toBeTruthy()
  })

  it('sends every incomplete account through first run, retaining a safe deep link', async () => {
    state.pathname = '/template/basic/setup'
    state.params = { source: 'finder', finderDays: '3', draftId: 'discarded' }
    render(route())

    await screen.findByTestId('entry-redirect')
    expect(redirect()).toEqual({ pathname: '/first-run', params: { next: '/template/basic/setup?source=finder&finderDays=3' } })
    expect(screen.queryByText('Route content')).toBeNull()
    expect(state.read).toHaveBeenCalledTimes(1)
  })

  it('shows the two-choice route until its authoritative profile receipt is completed', async () => {
    state.pathname = '/first-run'
    state.params = { next: '/settings?section=starting-numbers' }
    render(route())
    await screen.findByText('Route content')

    act(() => client.setQueryData(accountQueryKeys.profile('account-a'), savedProfile('account-a', true)))

    await screen.findByTestId('entry-redirect')
    expect(redirect()).toBe('/settings?section=starting-numbers')
    expect(screen.queryByText('Route content')).toBeNull()
  })

  it('returns completed sign-ins to Today for an invalid continuation', async () => {
    state.pathname = '/auth'
    state.params = { next: 'https://example.com' }
    state.read.mockResolvedValue(savedProfile('account-a', true))
    render(route())

    await screen.findByTestId('entry-redirect')
    expect(redirect()).toBe('/(tabs)')
  })

  it('recovers a cold profile failure in place before allowing route content', async () => {
    state.read.mockRejectedValueOnce(new Error('Connection failed')).mockResolvedValue(savedProfile('account-a', true))
    render(route())

    await screen.findByText('Check your connection, then try again. You are still signed in.')
    expect(screen.queryByTestId('entry-redirect')).toBeNull()
    expect(screen.queryByText('Route content')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByText('Route content')
    expect(state.read).toHaveBeenCalledTimes(2)
  })

  it('does not let retained stack screens send competing redirects', async () => {
    state.focused = false
    state.pathname = '/auth'
    state.read.mockResolvedValue(savedProfile('account-a', true))
    render(route())

    await waitFor(() => expect(client.getQueryData(accountQueryKeys.profile('account-a'))).toBeTruthy())
    expect(screen.queryByTestId('entry-redirect')).toBeNull()
    expect(screen.queryByText('Route content')).toBeNull()
  })

  it('ignores an old account response while the next account profile is loading', async () => {
    let finishOld!: (value: ReturnType<typeof savedProfile>) => void
    let finishNext!: (value: ReturnType<typeof savedProfile>) => void
    state.read.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
      .mockImplementationOnce(() => new Promise(resolve => { finishNext = resolve }))
    const view = render(route())
    state.user = { id: 'account-b' } as User
    view.rerender(route())

    await act(async () => finishOld(savedProfile('account-a', true)))
    expect(screen.queryByTestId('entry-redirect')).toBeNull()
    expect(screen.queryByText('Route content')).toBeNull()
    await act(async () => finishNext(savedProfile('account-b', false)))
    await screen.findByTestId('entry-redirect')
    expect(redirect()).toEqual({ pathname: '/first-run', params: { next: '/(tabs)' } })
  })

  it('rejects a profile receipt whose account does not match the session', async () => {
    state.read.mockResolvedValue(savedProfile('account-b', true))
    render(route())

    await screen.findByText('Your profile could not load')
    expect(screen.queryByText('Route content')).toBeNull()
    expect(screen.queryByTestId('entry-redirect')).toBeNull()
  })

  it('keeps a known current-account profile usable through a background refresh failure', async () => {
    client.setQueryData(accountQueryKeys.profile('account-a'), savedProfile('account-a', true))
    state.read.mockRejectedValue(new Error('Background refresh failed'))
    render(route())

    await act(async () => { await client.invalidateQueries({ queryKey: accountQueryKeys.profile('account-a') }) })
    expect(screen.getByText('Route content')).toBeTruthy()
    expect(screen.queryByText('Your profile could not load')).toBeNull()
  })
})
