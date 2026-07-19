import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { todayResponseSchema, workoutSessionSchema, type TodayResponse } from '@sheetless/api'
import type { WorkoutSession } from '@sheetless/core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const apiUrl = process.env.MOBILE_API_INTEGRATION_URL?.replace(/\/$/, '')
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const enabled = Boolean(apiUrl && supabaseUrl && supabaseKey)
const password = process.env.E2E_DEMO_PASSWORD ?? 'DemoPass123!'

type AuthenticatedFixture = {
  client: SupabaseClient
  token: string
}

type ErrorEnvelope = {
  error: { code: string; message: string; requestId: string }
}

async function signIn(email: string): Promise<AuthenticatedFixture> {
  const client = createClient(supabaseUrl!, supabaseKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `sheetless-mobile-api-${email}`,
    },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Unable to sign in ${email}: ${error.message}`)
  if (!data.session) throw new Error(`No session returned for ${email}`)
  return { client, token: data.session.access_token }
}

function request(path: string, token?: string, init: RequestInit = {}) {
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
}

async function data<T>(response: Response): Promise<T> {
  expect(response.ok, await response.clone().text()).toBe(true)
  return ((await response.json()) as { data: T }).data
}

async function error(response: Response): Promise<ErrorEnvelope['error']> {
  return ((await response.json()) as ErrorEnvelope).error
}

describe.skipIf(!enabled).sequential('mobile API against local Supabase', () => {
  let linear: AuthenticatedFixture
  let wave: AuthenticatedFixture
  let startedSessionId: string | null = null
  let pendingDecisionSnapshots: Array<{ id: string; resolved_at: string | null; status: string }> = []

  beforeAll(async () => {
    const fixtures = await Promise.all([
      signIn(process.env.MOBILE_API_LINEAR_EMAIL ?? 'demo.linear@sheetless.local'),
      signIn(process.env.MOBILE_API_WAVE_EMAIL ?? 'demo.wave@sheetless.local'),
    ])
    linear = fixtures[0]
    wave = fixtures[1]
  })

  afterAll(async () => {
    const cleanupErrors: unknown[] = []
    if (startedSessionId) {
      const { data: removed, error: removeError } = await wave.client
        .from('workout_sessions')
        .delete()
        .eq('id', startedSessionId)
        .select('id')
      if (removeError) cleanupErrors.push(removeError)
      else if (removed.length !== 1) cleanupErrors.push(new Error('Temporary workout was not removed.'))
    }
    for (const decision of pendingDecisionSnapshots) {
      const { error: restoreError } = await wave.client
        .from('progression_decisions')
        .update({ status: decision.status, resolved_at: decision.resolved_at })
        .eq('id', decision.id)
      if (restoreError) cleanupErrors.push(restoreError)
    }
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'API integration cleanup failed.')
  })

  it('enforces bearer auth and returns the versioned error envelope', async () => {
    const missing = await request('/api/v1/me')
    expect(missing.status).toBe(401)
    expect(await error(missing)).toMatchObject({ code: 'UNAUTHENTICATED' })

    const malformed = await request('/api/v1/me', undefined, {
      headers: { Authorization: 'Basic not-a-bearer-token' },
    })
    expect(malformed.status).toBe(401)

    const expired = await request('/api/v1/me', 'expired.jwt.value')
    expect(expired.status).toBe(401)
    expect(await error(expired)).toMatchObject({ code: 'UNAUTHENTICATED' })

    const me = await request('/api/v1/me', linear.token)
    expect(me.status).toBe(200)
    expect(me.headers.get('cache-control')).toBe('no-store')
    expect(await data<{ email: string }>(me)).toMatchObject({
      email: 'demo.linear@sheetless.local',
    })
  })

  it('returns active and progression-blocked Today states', async () => {
    const [active, blocked] = await Promise.all(
      [linear.token, wave.token].map(async (token) =>
        todayResponseSchema.parse(await data<TodayResponse>(await request('/api/v1/today', token))),
      ),
    )

    expect(active.activeSession).not.toBeNull()
    expect(blocked.activeSession).toBeNull()
    expect(blocked.pendingDecisionCount).toBeGreaterThan(0)
  })

  it('starts idempotently, hides cross-user sessions, and validates set updates', async () => {
    const { data: decisions, error: decisionError } = await wave.client
      .from('progression_decisions')
      .select('id, resolved_at, status')
      .eq('status', 'pending')
    if (decisionError) throw decisionError
    pendingDecisionSnapshots = decisions ?? []
    expect(pendingDecisionSnapshots.length).toBeGreaterThan(0)
    const { error: dismissError } = await wave.client
      .from('progression_decisions')
      .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
      .in('id', pendingDecisionSnapshots.map((decision) => decision.id))
    if (dismissError) throw dismissError

    const planned = todayResponseSchema.parse(
      await data<TodayResponse>(await request('/api/v1/today', wave.token)),
    )
    expect(planned.pendingDecisionCount).toBe(0)
    expect(planned.plannedSession).not.toBeNull()

    const mutationId = crypto.randomUUID()
    const startBody = JSON.stringify({ kind: 'planned', clientMutationId: mutationId })
    const start = async () => workoutSessionSchema.parse(await data<WorkoutSession>(await request(
        '/api/v1/sessions',
        wave.token,
        { method: 'POST', body: startBody },
      )))
    const [first, retried] = await Promise.all([start(), start()])
    startedSessionId = first.sessionId
    expect(retried.sessionId).toBe(first.sessionId)
    for (const session of [first, retried]) {
      expect(session.movements.every((movement) =>
        movement.sets.every((set) => set.exerciseLogId === movement.id))).toBe(true)
    }

    const inaccessible = await request(`/api/v1/sessions/${first.sessionId}`, linear.token)
    expect(inaccessible.status).toBe(404)
    expect(await error(inaccessible)).toMatchObject({ code: 'NOT_FOUND' })

    const movement = first.movements[0]
    const set = movement?.sets[0]
    expect(movement).toBeDefined()
    expect(set).toBeDefined()
    const patchId = crypto.randomUUID()
    const patchPath = `/api/v1/sessions/${first.sessionId}/sets/${movement!.id}/${set!.setIndex}`
    const patchBody = JSON.stringify({
      actualLoad: 61.25,
      actualReps: 5,
      actualRir: 2,
      actualRpe: null,
      note: null,
      completed: true,
      clientMutationId: patchId,
    })
    const updated = workoutSessionSchema.parse(await data<WorkoutSession>(await request(
      patchPath,
      wave.token,
      { method: 'PATCH', body: patchBody },
    )))
    const saved = updated.movements[0]?.sets.find((item) => item.setIndex === set!.setIndex)
    expect(saved).toMatchObject({ actualLoad: 61.25, actualReps: 5, actualRir: 2, completed: true })

    const retriedPatch = await data<WorkoutSession>(await request(
      patchPath,
      wave.token,
      { method: 'PATCH', body: patchBody },
    ))
    expect(retriedPatch.sessionId).toBe(first.sessionId)

    const invalid = await request(patchPath, wave.token, {
      method: 'PATCH',
      body: JSON.stringify({ actualLoad: -1, completed: true, clientMutationId: crypto.randomUUID() }),
    })
    expect(invalid.status).toBe(422)
    expect(await error(invalid)).toMatchObject({ code: 'VALIDATION_ERROR' })

    const missingSet = await request(
      `/api/v1/sessions/${first.sessionId}/sets/${movement!.id}/99999`,
      wave.token,
      {
        method: 'PATCH',
        body: JSON.stringify({ completed: true, clientMutationId: crypto.randomUUID() }),
      },
    )
    expect(missingSet.status).toBe(404)
    expect(await error(missingSet)).toMatchObject({ code: 'NOT_FOUND' })
  })

  it('rejects edits to completed sessions with a stable conflict', async () => {
    const { data: completed, error: completedError } = await wave.client
      .from('workout_sessions')
      .select('id')
      .eq('status', 'completed')
      .limit(1)
      .single()
    if (completedError) throw completedError
    const owned = workoutSessionSchema.parse(await data<WorkoutSession>(await request(
      `/api/v1/sessions/${completed.id}`,
      wave.token,
    )))
    const movement = owned.movements[0]
    const set = movement?.sets[0]
    expect(movement).toBeDefined()
    expect(set).toBeDefined()

    const response = await request(
      `/api/v1/sessions/${owned.sessionId}/sets/${movement!.id}/${set!.setIndex}`,
      wave.token,
      {
        method: 'PATCH',
        body: JSON.stringify({ completed: true, clientMutationId: crypto.randomUUID() }),
      },
    )
    expect(response.status).toBe(409)
    expect(await error(response)).toMatchObject({ code: 'SESSION_NOT_EDITABLE' })
  })
})
