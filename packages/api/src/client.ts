import type { WorkoutSession } from '@sheetless/core'
import type { ZodType } from 'zod'
import {
  magicLinkIntentInputSchema,
  magicLinkIntentSchema,
  nativeProfileSchema,
  startPlannedSessionInputSchema,
  todayResponseSchema,
  updateSetLogInputSchema,
  workoutSessionSchema,
  type MagicLinkIntentInput,
  type StartPlannedSessionInput,
  type UpdateSetLogInput,
} from './contracts'
import { parseApiError, SheetlessApiError } from './errors'

export type ResponseLike = {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

export type FetchLike = (
  url: string,
  init: {
    method: string
    headers: Record<string, string>
    body?: string
  },
) => Promise<ResponseLike>

export type SheetlessApiClientOptions = {
  baseUrl: string
  getAccessToken: () => Promise<string | null>
  refreshAccessToken: () => Promise<string | null>
  clearSession: () => Promise<void>
  fetch?: FetchLike
}

type RequestOptions<T> = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  schema: ZodType<T>
  authenticated?: boolean
}

export function createSheetlessApiClient(options: SheetlessApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const fetcher = options.fetch ?? (globalThis as unknown as { fetch: FetchLike }).fetch

  async function send(path: string, init: RequestOptions<unknown>, token: string | null) {
    return fetcher(`${baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    })
  }

  async function request<T>(path: string, init: RequestOptions<T>): Promise<T> {
    const authenticated = init.authenticated ?? true
    let token = authenticated ? await options.getAccessToken() : null
    let response = await send(path, init, token)

    if (authenticated && response.status === 401) {
      try {
        token = await options.refreshAccessToken()
      } catch {
        token = null
      }
      if (token) response = await send(path, init, token)
      if (!token || response.status === 401) await options.clearSession()
    }

    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    if (!response.ok) throw parseApiError(payload, response.status)
    if (!payload || typeof payload !== 'object' || !('data' in payload)) {
      throw new SheetlessApiError({
        code: 'INTERNAL_ERROR',
        message: 'The server returned an invalid response.',
        status: response.status,
      })
    }
    return init.schema.parse((payload as { data: unknown }).data)
  }

  return {
    magicLinkIntent(input: MagicLinkIntentInput) {
      const body = magicLinkIntentInputSchema.parse(input)
      return request('/api/v1/auth/magic-link-intent', {
        method: 'POST',
        body,
        schema: magicLinkIntentSchema,
        authenticated: false,
      })
    },
    getMe() {
      return request('/api/v1/me', { schema: nativeProfileSchema })
    },
    getToday() {
      return request('/api/v1/today', { schema: todayResponseSchema })
    },
    startPlannedSession(input: StartPlannedSessionInput): Promise<WorkoutSession> {
      const body = startPlannedSessionInputSchema.parse(input)
      return request('/api/v1/sessions', { method: 'POST', body, schema: workoutSessionSchema })
    },
    getSession(sessionId: string): Promise<WorkoutSession> {
      return request(`/api/v1/sessions/${encodeURIComponent(sessionId)}`, { schema: workoutSessionSchema })
    },
    updateSet(
      sessionId: string,
      exerciseLogId: string,
      setIndex: number,
      input: UpdateSetLogInput,
    ): Promise<WorkoutSession> {
      const body = updateSetLogInputSchema.parse(input)
      return request(
        `/api/v1/sessions/${encodeURIComponent(sessionId)}/sets/${encodeURIComponent(exerciseLogId)}/${setIndex}`,
        { method: 'PATCH', body, schema: workoutSessionSchema },
      )
    },
  }
}

export type SheetlessApiClient = ReturnType<typeof createSheetlessApiClient>
