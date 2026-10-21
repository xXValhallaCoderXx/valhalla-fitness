import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { SessionStatus } from '../src/lib/session-provider'

const state = vi.hoisted(() => ({
  status: 'signedOut' as SessionStatus,
  user: null as { id: string } | null,
  themeReady: true,
  fontsLoaded: true,
  mounts: 0,
  unmounts: 0,
  hideSplash: vi.fn(),
}))
vi.mock('@/lib/uuid-polyfill', () => ({}))
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }))
vi.mock('expo-font', () => ({ useFonts: () => [state.fontsLoaded, null] }))
vi.mock('@/lib/fonts', () => ({ nativeFonts: {} }))
vi.mock('expo-splash-screen', () => ({ preventAutoHideAsync: vi.fn(), hideAsync: state.hideSplash }))
vi.mock('expo-system-ui', () => ({ setBackgroundColorAsync: vi.fn() }))
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }))
vi.mock('@/lib/AppNavigationBar', () => ({ AppNavigationBar: () => null }))
vi.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: ({ children }: { children: ReactNode }) => children }))
vi.mock('@/lib/session-provider', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => children,
  useSession: () => ({ status: state.status, user: state.user }),
}))
vi.mock('@/lib/theme-provider', () => ({
  SheetlessThemeProvider: ({ children }: { children: ReactNode }) => children,
  useSheetlessTheme: () => ({ isThemeReady: state.themeReady }),
}))
vi.mock('@/lib/tokens', () => ({ useTokens: () => ({ theme: { scheme: 'light', tones: { danger: { text: 'red' } } } }) }))
vi.mock('@/features/onboarding/EntryGate', () => ({ entryScreenLayout: ({ children }: { children: ReactNode }) => children }))
vi.mock('expo-router', async () => {
  const { useEffect, useState } = await import('react')
  function Stack() {
    // Like a navigator, this loses its route state on unmount. Other tests cover EntryGate's
    // redirect decisions; this test pins down the parent lifecycle that must preserve them.
    const [location, setLocation] = useState('/(tabs)')
    useEffect(() => { state.mounts += 1; return () => { state.unmounts += 1 } }, [])
    return <div><span>{location}</span><button onClick={() => setLocation('/auth?next=/templates/find')}>Open auth continuation</button></div>
  }
  Stack.Screen = () => null
  return { Stack, DarkTheme: { colors: {} }, DefaultTheme: { colors: {} }, ThemeProvider: ({ children }: { children: ReactNode }) => children }
})

import RootLayout from '../src/app/_layout'

beforeEach(() => {
  state.status = 'signedOut'
  state.user = null
  state.themeReady = true
  state.fontsLoaded = true
  state.mounts = 0
  state.unmounts = 0
  state.hideSplash.mockClear()
})

it('preserves the live navigator and auth continuation while sign-in loads the account theme', () => {
  const view = render(<RootLayout />)
  fireEvent.click(screen.getByRole('button', { name: 'Open auth continuation' }))
  expect(screen.getByText('/auth?next=/templates/find')).toBeTruthy()

  state.status = 'signedIn'
  state.user = { id: 'returning-account' }
  state.themeReady = false
  view.rerender(<RootLayout />)

  expect(screen.getByText('/auth?next=/templates/find')).toBeTruthy()
  expect(state.mounts).toBe(1)
  expect(state.unmounts).toBe(0)
  state.themeReady = true
  view.rerender(<RootLayout />)
  expect(screen.getByText('/auth?next=/templates/find')).toBeTruthy()
  expect(state.mounts).toBe(1)
})

it('mounts beneath the cold-start splash after restoration without exposing an unresolved theme', () => {
  state.status = 'restoring'
  state.themeReady = false
  const view = render(<RootLayout />)
  expect(state.mounts).toBe(0)
  expect(state.hideSplash).not.toHaveBeenCalled()

  state.status = 'signedIn'
  state.user = { id: 'stored-account' }
  view.rerender(<RootLayout />)
  expect(state.mounts).toBe(1)
  expect(state.hideSplash).not.toHaveBeenCalled()

  state.themeReady = true
  view.rerender(<RootLayout />)
  expect(state.hideSplash).toHaveBeenCalledOnce()
  expect(state.mounts).toBe(1)
  expect(state.unmounts).toBe(0)
})
