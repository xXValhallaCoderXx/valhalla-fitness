import { describe, expect, it } from 'vitest'
import {
  ensureProfile,
  getMe,
  updateSettings,
  updateSex,
  updateTimezone,
} from '@sheetless/data/account/profile'
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

  it('normalizes legacy equipment aliases without dropping unknown values', async () => {
    const { ctx } = makeStubCtx({
      profiles: [{
        id: 'user-1',
        units: 'kg',
        rounding: 2.5,
        equipment_profile: [
          'specialty_bars',
          'future_station',
          'specialty_bar',
          'blocks',
        ],
      }],
    })

    expect((await getMe(ctx)).equipmentProfile).toEqual([
      'specialty_bar',
      'future_station',
      'box',
    ])
  })
})

describe('updateTimezone', () => {
  it('writes the timezone and returns the refreshed profile', async () => {
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', units: 'kg', rounding: 2.5, timezone: 'UTC' }],
    })

    const me = await updateTimezone(ctx, { timezone: ' Asia/Singapore ' })

    expect(stub.updateCalls).toEqual([
      { table: 'profiles', values: { timezone: 'Asia/Singapore' }, filters: [['id', 'user-1']] },
    ])
    expect(me.timezone).toBe('Asia/Singapore')
  })

  it('rejects invalid input before issuing an update', async () => {
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', units: 'kg', rounding: 2.5, timezone: 'UTC' }],
    })

    await expect(updateTimezone(ctx, { timezone: 'Mars/Olympus' })).rejects.toThrow()
    expect(stub.updateCalls).toHaveLength(0)
  })
})

describe('updateSettings', () => {
  it('writes the full settings payload while preserving unrelated profile fields', async () => {
    const { ctx, stub } = makeStubCtx({
      profiles: [{
        id: 'user-1',
        email: 'user-1@test.local',
        display_name: 'Test Lifter',
        units: 'kg',
        rounding: 2.5,
        equipment_profile: ['barbell'],
        theme_preference: 'system',
        program_state_defaults: {},
        timezone: 'Asia/Singapore',
        onboarding_completed: true,
        live_onboarding_dismissed: true,
        post_workout_feedback_dismissed: true,
        sex: null,
        auto_start_timer: true,
        default_rest_seconds: 120,
      }],
    })

    const profile = await updateSettings(ctx, {
      units: 'lb',
      rounding: 5,
      equipmentProfile: [' cable '],
      themePreference: 'dark',
      programStateDefaults: { squat_one_rep_max: 225 },
      sex: 'female',
      autoStartTimer: false,
      defaultRestSeconds: 180,
    })

    expect(stub.updateCalls).toHaveLength(1)
    expect(stub.updateCalls[0]?.values).toMatchObject({
      units: 'lb',
      rounding: 5,
      equipment_profile: ['cable'],
      theme_preference: 'dark',
      program_state_defaults: { squat_one_rep_max: 225 },
      sex: 'female',
      auto_start_timer: false,
      default_rest_seconds: 180,
    })
    expect(stub.updateCalls[0]?.values).not.toHaveProperty('timezone')
    expect(stub.updateCalls[0]?.values).not.toHaveProperty('onboarding_completed')
    expect(stub.updateCalls[0]?.values).not.toHaveProperty('live_onboarding_dismissed')
    expect(stub.updateCalls[0]?.values).not.toHaveProperty('post_workout_feedback_dismissed')
    expect(profile).toMatchObject({
      units: 'lb',
      rounding: 5,
      equipmentProfile: ['cable'],
      themePreference: 'dark',
      timezone: 'Asia/Singapore',
      onboardingCompleted: true,
      liveOnboardingDismissed: true,
      postWorkoutFeedbackDismissed: true,
      sex: 'female',
      autoStartTimer: false,
      defaultRestSeconds: 180,
    })
  })

  it('rejects malformed and over-posted settings before issuing an update', async () => {
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', units: 'kg', rounding: 2.5 }],
    })
    const valid = {
      units: 'kg' as const,
      rounding: 2.5,
      equipmentProfile: ['barbell'],
      themePreference: 'system' as const,
      programStateDefaults: { squat_one_rep_max: 100 },
    }

    await expect(updateSettings(ctx, {
      ...valid,
      equipmentProfile: ['barbell', ' barbell '],
    })).rejects.toThrow()
    await expect(updateSettings(ctx, {
      ...valid,
      defaultRestSeconds: 29,
    })).rejects.toThrow()
    await expect(updateSettings(ctx, {
      ...valid,
      onboardingCompleted: true,
    } as never)).rejects.toThrow()
    expect(stub.updateCalls).toHaveLength(0)
  })

  it('writes canonical equipment identifiers while retaining unknown values', async () => {
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', units: 'kg', rounding: 2.5 }],
    })

    const profile = await updateSettings(ctx, {
      units: 'kg',
      rounding: 2.5,
      equipmentProfile: [
        ' specialty_bars ',
        'specialty_bar',
        'blocks',
        'future_station',
      ],
      themePreference: 'system',
      programStateDefaults: {},
    })

    expect(stub.updateCalls[0]?.values).toMatchObject({
      equipment_profile: ['specialty_bar', 'box', 'future_station'],
    })
    expect(profile.equipmentProfile).toEqual([
      'specialty_bar',
      'box',
      'future_station',
    ])
  })
})

describe('updateSex', () => {
  it('rejects unsupported values before issuing an update', async () => {
    const { ctx, stub } = makeStubCtx({
      profiles: [{ id: 'user-1', units: 'kg', rounding: 2.5, sex: null }],
    })

    await expect(updateSex(ctx, { sex: 'unsupported' } as never)).rejects.toThrow()
    expect(stub.updateCalls).toHaveLength(0)
  })
})
