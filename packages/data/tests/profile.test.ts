import { describe, expect, it } from 'vitest'
import { ensureProfile, getMe, updateTimezone } from '@sheetless/data/account/profile'
import { makeStubCtx, makeStubUser } from './support/supabase-stub'

describe('ensureProfile', () => {
  it('creates a defaults-seeded profile row on first sign-in', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [] })

    const profile = await ensureProfile(ctx)

    expect(stub.insertCalls).toHaveLength(1)
    expect(stub.insertCalls[0].rows[0]).toMatchObject({
      id: 'user-1',
      email: 'user-1@test.local',
      display_name: null,
      units: 'kg',
      rounding: 2.5,
      theme_preference: 'system',
    })
    expect(profile.id).toBe('user-1')
  })

  it('captures an OAuth display name from user metadata', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [] })
    ctx.user = { ...makeStubUser('user-1'), user_metadata: { full_name: 'Renate G' } }

    await ensureProfile(ctx)

    expect(stub.insertCalls[0].rows[0]).toMatchObject({ display_name: 'Renate G' })
  })

  it('returns the existing row without inserting again', async () => {
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', email: 'user-1@test.local', units: 'lb', rounding: 5 }],
    })

    const profile = await ensureProfile(ctx)

    expect(stub.insertCalls).toHaveLength(0)
    expect(profile).toMatchObject({ units: 'lb' })
  })
})

describe('getMe', () => {
  it('maps a sparse row to a fully-defaulted UserProfile', async () => {
    const { ctx } = makeStubCtx({
      profiles: [{ id: 'user-1', email: 'user-1@test.local', units: 'kg', rounding: '2.5', timezone: 'Asia/Singapore' }],
    })

    const me = await getMe(ctx)

    expect(me).toMatchObject({
      id: 'user-1',
      units: 'kg',
      rounding: 2.5,
      equipmentProfile: [],
      themePreference: 'system',
      timezone: 'Asia/Singapore',
      onboardingCompleted: false,
      liveOnboardingDismissed: false,
      postWorkoutFeedbackDismissed: false,
      sex: null,
      autoStartTimer: true,
      defaultRestSeconds: 120,
    })
    expect(me.programStateDefaults).toBeTruthy()
  })

  it('normalizes an invalid stored timezone to null', async () => {
    const { ctx } = makeStubCtx({
      profiles: [{ id: 'user-1', units: 'kg', rounding: 2.5, timezone: 'Mars/Olympus' }],
    })
    expect((await getMe(ctx)).timezone).toBeNull()
  })
})

describe('updateTimezone', () => {
  it('writes the timezone and returns the refreshed profile', async () => {
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', units: 'kg', rounding: 2.5, timezone: 'UTC' }],
    })

    const me = await updateTimezone(ctx, { timezone: 'Asia/Singapore' })

    expect(stub.updateCalls).toEqual([
      { table: 'profiles', values: { timezone: 'Asia/Singapore' }, filters: [['id', 'user-1']] },
    ])
    expect(me.timezone).toBe('Asia/Singapore')
  })
})
