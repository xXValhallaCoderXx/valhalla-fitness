import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ send: vi.fn(), verify: vi.fn(), listeners: new Set<(state: string) => void>() }))
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: { signInWithOtp: api.send, verifyOtp: api.verify } }) }))
vi.mock('react-native', () => ({ AppState: {
  addEventListener: (_event: string, listener: (state: string) => void) => {
    api.listeners.add(listener)
    return { remove: () => api.listeners.delete(listener) }
  },
} }))
import { useAuthFlow } from '../src/features/auth/useAuthFlow'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function form(allowCreation = true, intent: 'create' | 'signIn' = 'create') {
  const hook = renderHook(() => useAuthFlow(allowCreation))
  act(() => { hook.result.current.open(intent); hook.result.current.setEmail(' Member@Example.test ') })
  return hook
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-27T10:00:00Z'))
  api.send.mockResolvedValue({ error: null })
  api.verify.mockResolvedValue({ data: { session: { user: { id: 'account-a' } } }, error: null })
})
afterEach(() => { vi.useRealTimers(); api.listeners.clear() })

describe('native email auth controller', () => {
  it('starts with welcome, retains identity between forms, and sends trimmed signup metadata', async () => {
    const { result } = renderHook(() => useAuthFlow(true))
    expect(result.current.step).toBe('welcome')
    act(() => { result.current.open('create'); result.current.setFirstName('  Nate  '); result.current.setEmail(' Member@Example.test ') })
    act(() => result.current.open('signIn'))
    expect(result.current.firstName).toBe('  Nate  ')
    act(() => result.current.open('create'))
    await act(() => result.current.sendCode())
    expect(api.send).toHaveBeenCalledExactlyOnceWith({ email: 'member@example.test', options: { shouldCreateUser: true, data: { full_name: 'Nate' } } })
    expect(result.current.step).toBe('code')
    expect(result.current.sentEmail).toBe('member@example.test')
    expect(result.current.cooldown).toBe(60)
  })

  it.each([
    { allow: true, intent: 'signIn' as const, expected: false, name: 'Nate' },
    { allow: false, intent: 'create' as const, expected: false, name: '   ' },
    { allow: true, intent: 'create' as const, expected: true, name: '   ' },
  ])('preserves account-creation policy for $intent, allow=$allow', async ({ allow, intent, expected, name }) => {
    const { result } = form(allow, intent)
    act(() => result.current.setFirstName(name))
    await act(() => result.current.sendCode())
    expect(api.send).toHaveBeenCalledExactlyOnceWith({ email: 'member@example.test', options: { shouldCreateUser: expected } })
  })

  it('does not send invalid addresses', async () => {
    const { result } = form()
    act(() => result.current.setEmail('not an address'))
    await act(() => result.current.sendCode())
    expect(api.send).not.toHaveBeenCalled()
    expect(result.current.error?.action).toBe('send')
  })

  it('blocks duplicate sends and draft/navigation races; a failed send retains fields for retry', async () => {
    const pending = deferred<{ error: null }>()
    api.send.mockReturnValueOnce(pending.promise)
    const { result } = form()
    act(() => result.current.setFirstName('Nate'))
    let first!: Promise<void>
    act(() => {
      first = result.current.sendCode()
      void result.current.sendCode()
      result.current.back()
      result.current.open('signIn')
      result.current.setEmail('other@example.test')
    })
    expect(api.send).toHaveBeenCalledTimes(1)
    expect(result.current.locked).toBe(true)
    await act(async () => { pending.reject(new Error('Email delivery unavailable')); await first })
    expect(result.current.step).toBe('identity')
    expect(result.current.intent).toBe('create')
    expect(result.current.email).toBe(' Member@Example.test ')
    expect(result.current.firstName).toBe('Nate')
    expect(result.current.error?.message).toBe('Email delivery unavailable')
    expect(result.current.cooldown).toBe(0)
    await act(() => result.current.sendCode())
    expect(api.send).toHaveBeenCalledTimes(2)
    expect(result.current.step).toBe('code')
  })

  it('uses elapsed wall time on foreground, and changing email cannot bypass the original cooldown', async () => {
    const { result } = form()
    await act(() => result.current.sendCode())
    await act(() => result.current.sendCode())
    expect(api.send).toHaveBeenCalledTimes(1)
    act(() => { result.current.back(); result.current.setEmail('other@example.test') })
    expect(result.current.cooldown).toBe(0)
    act(() => result.current.setEmail('MEMBER@example.test'))
    expect(result.current.cooldown).toBe(60)
    act(() => {
      vi.setSystemTime(new Date('2026-09-27T10:01:15Z'))
      api.listeners.forEach(listener => listener('active'))
    })
    expect(result.current.cooldown).toBe(0)
    await act(() => result.current.sendCode())
    expect(api.send).toHaveBeenCalledTimes(2)
    expect(result.current.cooldown).toBe(60)
  })

  it('normalizes a pasted code, auto-verifies once, retains failure and supports explicit retry', async () => {
    api.verify.mockResolvedValueOnce({ data: { session: null }, error: new Error('That code has expired') })
    const { result } = form()
    await act(() => result.current.sendCode())
    await act(async () => result.current.setCode('123 456'))
    expect(api.verify).toHaveBeenCalledExactlyOnceWith({ email: 'member@example.test', token: '123456', type: 'email' })
    expect(result.current.code).toBe('123456')
    expect(result.current.error?.message).toBe('That code has expired')
    await act(async () => result.current.setCode('123456'))
    expect(api.verify).toHaveBeenCalledTimes(1)
    await act(() => result.current.verifyCode())
    expect(api.verify).toHaveBeenCalledTimes(2)
    expect(result.current.verified).toBe(true)
    expect(result.current.locked).toBe(true)
    act(() => { result.current.back(); result.current.setEmail('other@example.test') })
    expect(result.current.step).toBe('code')
    expect(result.current.email).toBe(' Member@Example.test ')
  })

  it('does not start a second verification or change identity during an in-flight verification', async () => {
    const pending = deferred<{ data: { session: null }; error: Error }>()
    api.verify.mockReturnValueOnce(pending.promise)
    const { result } = form()
    await act(() => result.current.sendCode())
    act(() => result.current.setCode('123456'))
    act(() => {
      void result.current.verifyCode()
      void result.current.sendCode()
      result.current.setCode('654321')
      result.current.back()
      result.current.open('signIn')
      result.current.setEmail('other@example.test')
    })
    expect(result.current.code).toBe('123456')
    expect(result.current.step).toBe('code')
    expect(api.verify).toHaveBeenCalledTimes(1)
    expect(api.send).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve({ data: { session: null }, error: new Error('Try again') }))
    expect(result.current.locked).toBe(false)
    await act(async () => result.current.setCode('654321'))
    expect(api.verify).toHaveBeenCalledTimes(2)
  })

  it('retains the entered code after failed resend; successful resend resets verification attempts', async () => {
    const { result } = form()
    await act(() => result.current.sendCode())
    api.verify.mockResolvedValue({ data: { session: null }, error: new Error('Invalid code') })
    await act(async () => result.current.setCode('123456'))
    act(() => vi.advanceTimersByTime(60_000))
    api.send.mockRejectedValueOnce(new Error('Connection failed'))
    await act(() => result.current.sendCode())
    expect(result.current.code).toBe('123456')
    expect(result.current.error?.action).toBe('send')
    await act(() => result.current.sendCode())
    expect(result.current.code).toBe('')
    await act(async () => result.current.setCode('123456'))
    expect(api.verify).toHaveBeenCalledTimes(2)
  })

  it('does not treat a missing session as signed in', async () => {
    api.verify.mockResolvedValue({ data: { session: null }, error: null })
    const { result } = form()
    await act(() => result.current.sendCode())
    await act(async () => result.current.setCode('123456'))
    expect(result.current.verified).toBe(false)
    expect(result.current.error?.action).toBe('verify')
    expect(result.current.locked).toBe(false)
  })

  it('ignores stale completion and callbacks after unmount without disturbing a new auth flow', async () => {
    const pending = deferred<{ error: null }>()
    api.send.mockReturnValueOnce(pending.promise)
    const old = form()
    let request!: Promise<void>
    act(() => { request = old.result.current.sendCode() })
    const stale = old.result.current
    old.unmount()
    const next = form(true, 'signIn')
    await act(async () => { pending.resolve({ error: null }); await request; await stale.sendCode(); stale.setCode('123456') })
    expect(next.result.current.step).toBe('identity')
    expect(next.result.current.cooldown).toBe(0)
    expect(api.send).toHaveBeenCalledTimes(1)
    expect(api.verify).not.toHaveBeenCalled()
  })
})
