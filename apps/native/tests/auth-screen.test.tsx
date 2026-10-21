import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { themeProviderMock } from './support/theme'

const api = vi.hoisted(() => ({ send: vi.fn(), verify: vi.fn(), openEmail: vi.fn(), openBrowser: vi.fn(), preventRemove: vi.fn() }))
vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: { signInWithOtp: api.send, verifyOtp: api.verify } }) }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }))
vi.mock('expo-router/react-navigation', () => ({ usePreventRemove: api.preventRemove }))
vi.mock('expo-web-browser', () => ({ openBrowserAsync: api.openBrowser }))
vi.mock('@/features/auth/open-email', () => ({ openEmailApp: api.openEmail }))
vi.mock('@/components', async () => {
  const { Button } = await import('../src/components/Button')
  const { Text } = await import('../src/components/Text')
  const { Heading } = await import('../src/components/Heading')
  const { Panel } = await import('../src/components/Panel')
  const { TextInput } = await import('../src/components/TextInput')
  return { Button, Text, Heading, Panel, TextInput, Caption: Text, SectionLabel: Text, BrandMark: () => null }
})
vi.stubGlobal('__DEV__', true)
const { AuthScreen } = await import('../src/features/auth/AuthScreen')

beforeEach(() => {
  vi.clearAllMocks()
  api.send.mockResolvedValue({ error: null })
  api.verify.mockResolvedValue({ data: { session: null }, error: new Error('Incorrect code') })
  api.openBrowser.mockResolvedValue({ type: 'dismiss' })
  api.openEmail.mockResolvedValue(false)
})

async function enterCodeScreen() {
  render(<AuthScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'member@example.test' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send my code' })))
  return screen.getByLabelText('6-digit sign-in code') as HTMLInputElement
}

describe('native auth controls', () => {
  it('marks the welcome workout as an example and offers separate create/sign-in entries', () => {
    render(<AuthScreen />)
    expect(screen.getByText('Example workout · Bench press')).toBeTruthy()
    expect(screen.getByText(/choose Apply or Keep/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    expect(screen.getByLabelText('First name, optional')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.queryByLabelText('First name, optional')).toBeNull()
    expect(screen.queryByLabelText(/password/i)).toBeNull()
  })

  it('keeps one autofill/paste target and an explicit retry after automatic code failure', async () => {
    const code = await enterCodeScreen()
    expect(code.getAttribute('autocomplete')).toBe('one-time-code')
    expect(code.hasAttribute('maxlength')).toBe(false)
    await act(async () => fireEvent.change(code, { target: { value: '123 456' } }))
    expect(code.value).toBe('123456')
    expect(api.verify).toHaveBeenCalledExactlyOnceWith({ email: 'member@example.test', token: '123456', type: 'email' })
    expect(screen.getByText('Incorrect code')).toBeTruthy()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry code' })))
    expect(api.verify).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Resend in 60s' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('does not block entering/verifying a code while waiting to return from the email app', async () => {
    api.openEmail.mockReturnValue(new Promise(() => {}))
    const code = await enterCodeScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Open your email app' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open your email app' }))
    expect(api.openEmail).toHaveBeenCalledTimes(1)
    expect(code.disabled).toBe(false)
    await act(async () => fireEvent.change(code, { target: { value: '123456' } }))
    expect(api.verify).toHaveBeenCalledTimes(1)
  })

  it('explains manual inbox recovery without losing the entered code', async () => {
    const code = await enterCodeScreen()
    fireEvent.change(code, { target: { value: '123' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Open your email app' })))
    expect(screen.getByText(/Open your email app manually/)).toBeTruthy()
    expect(code.value).toBe('123')
  })

  it('disables Back and Change email while verification can change the global session', async () => {
    api.verify.mockReturnValue(new Promise(() => {}))
    const code = await enterCodeScreen()
    fireEvent.change(code, { target: { value: '123456' } })
    expect(screen.getByRole('button', { name: 'Back' }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('button', { name: 'Change email' }).getAttribute('aria-disabled')).toBe('true')
    expect(code.readOnly).toBe(true)
    expect(api.preventRemove).toHaveBeenLastCalledWith(true, expect.any(Function))
  })
})
