import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn((url: string, anonKey: string, options: unknown) => ({
    anonKey,
    options,
    url,
  })),
  getCookies: vi.fn<() => Record<string, string>>(),
  setCookie: vi.fn(),
  setResponseHeader: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))

vi.mock('@tanstack/react-start/server', () => ({
  getCookies: mocks.getCookies,
  setCookie: mocks.setCookie,
  setResponseHeader: mocks.setResponseHeader,
}))

import { getSupabaseServerClient } from '../src/shared/server/supabase'

type CookieOptions = {
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: boolean | 'lax' | 'strict' | 'none'
  secure?: boolean
}

type SupabaseCookieAdapter = {
  getAll: () => Array<{ name: string; value: string }>
  setAll: (
    cookies: Array<{ name: string; value: string; options: CookieOptions }>,
    headers: Record<string, string>,
  ) => void
}

function createCookieAdapter() {
  getSupabaseServerClient()
  const call = mocks.createServerClient.mock.calls.at(-1)
  if (!call) throw new Error('Expected createServerClient to be called')
  return (call[2] as { cookies: SupabaseCookieAdapter }).cookies
}

describe('Supabase server session cookies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
    mocks.getCookies.mockReturnValue({ existing: 'cookie-value' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('forwards persistent and removal options supplied by Supabase', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const cookies = createCookieAdapter()

    expect(cookies.getAll()).toEqual([{ name: 'existing', value: 'cookie-value' }])

    cookies.setAll(
      [
        {
          name: 'sb-auth-token',
          value: 'refreshed-session',
          options: { httpOnly: false, maxAge: 34_560_000, path: '/auth', sameSite: 'strict' },
        },
        {
          name: 'sb-auth-token.1',
          value: '',
          options: { maxAge: 0 },
        },
      ],
      {},
    )

    expect(mocks.setCookie).toHaveBeenNthCalledWith(1, 'sb-auth-token', 'refreshed-session', {
      httpOnly: false,
      maxAge: 34_560_000,
      path: '/auth',
      sameSite: 'strict',
      secure: false,
    })
    expect(mocks.setCookie).toHaveBeenNthCalledWith(2, 'sb-auth-token.1', '', {
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: false,
    })
  })

  it('enforces secure production cookies and applies token-rotation cache headers', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const cookies = createCookieAdapter()

    cookies.setAll(
      [
        {
          name: 'sb-auth-token',
          value: 'refreshed-session',
          options: { maxAge: 34_560_000, secure: false },
        },
      ],
      {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        Expires: '0',
        Pragma: 'no-cache',
      },
    )

    expect(mocks.setCookie).toHaveBeenCalledWith(
      'sb-auth-token',
      'refreshed-session',
      expect.objectContaining({ maxAge: 34_560_000, secure: true }),
    )
    expect(mocks.setResponseHeader.mock.calls).toEqual([
      ['Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0'],
      ['Expires', '0'],
      ['Pragma', 'no-cache'],
    ])
  })
})
