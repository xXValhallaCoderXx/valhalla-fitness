import { describe, expect, it, vi } from 'vitest'
import { createSheetlessApiClient, SheetlessApiError, type FetchLike } from '../src'

function response(status: number, payload: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload }
}

const today = {
  activeSession: null,
  plannedSession: null,
  completedSession: null,
  hasActiveProgram: false,
  pendingDecisionCount: 0,
}

describe('typed API client', () => {
  it('refreshes once after 401 and retries with the new access token', async () => {
    const calls: Array<Record<string, string>> = []
    const fetcher: FetchLike = vi.fn(async (_url, init) => {
      calls.push(init.headers)
      return calls.length === 1
        ? response(401, { error: { code: 'UNAUTHENTICATED', message: 'expired', requestId: 'r1' } })
        : response(200, { data: today })
    })
    const clearSession = vi.fn(async () => undefined)
    const client = createSheetlessApiClient({
      baseUrl: 'https://api.example.test/',
      getAccessToken: async () => 'old-token',
      refreshAccessToken: async () => 'new-token',
      clearSession,
      fetch: fetcher,
    })

    await expect(client.getToday()).resolves.toEqual(today)
    expect(calls.map((headers) => headers.Authorization)).toEqual(['Bearer old-token', 'Bearer new-token'])
    expect(clearSession).not.toHaveBeenCalled()
  })

  it('clears the session when the retried request is still unauthorized', async () => {
    const fetcher: FetchLike = vi.fn(async () =>
      response(401, { error: { code: 'UNAUTHENTICATED', message: 'expired', requestId: 'r2' } }),
    )
    const clearSession = vi.fn(async () => undefined)
    const client = createSheetlessApiClient({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'old-token',
      refreshAccessToken: async () => 'new-token',
      clearSession,
      fetch: fetcher,
    })

    await expect(client.getToday()).rejects.toMatchObject<Partial<SheetlessApiError>>({
      code: 'UNAUTHENTICATED',
      requestId: 'r2',
      status: 401,
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(clearSession).toHaveBeenCalledOnce()
  })
})
