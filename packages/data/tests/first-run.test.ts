import { describe, expect, it, vi } from 'vitest'
import { completeFirstRun } from '@sheetless/data/account/profile'
import { makeStubCtx } from './support/supabase-stub'

const input = { units: 'lb', experienceMode: 'full' } as const
const firstStamp = '2026-09-27T01:00:00.000Z'
const nextStamp = '2026-09-27T01:01:00.000Z'
const profile = () => ({
  id: 'user-1', email: 'member@example.test', display_name: 'Nate',
  units: 'kg', rounding: 5, program_state_defaults: { squat_one_rep_max: 100, bench_press_one_rep_max: null },
  onboarding_completed: false, experience_mode: 'guided', updated_at: firstStamp,
  theme_preference: 'dark', equipment_profile: ['barbell'], timezone: 'Asia/Singapore',
  sex: 'female', auto_start_timer: false, default_rest_seconds: 180,
  live_onboarding_dismissed: true, post_workout_feedback_dismissed: true,
  show_formulas: true, full_mode_hint_dismissed_at: firstStamp,
})

describe('completeFirstRun', () => {
  it('atomically saves choices and completion, converting estimates with current rounding', async () => {
    const original = profile()
    const other = { ...profile(), id: 'user-2' }
    const { ctx, stub } = makeStubCtx({ profiles: [{ ...original }, other] })

    const saved = await completeFirstRun(ctx, input)

    expect(stub.updateCalls).toHaveLength(1)
    expect(stub.updateCalls[0].filters).toEqual([
      ['id', 'user-1'], ['onboarding_completed', false], ['updated_at', firstStamp],
    ])
    expect(Object.keys(stub.updateCalls[0].values).sort()).toEqual([
      'experience_mode', 'onboarding_completed', 'program_state_defaults', 'units',
    ])
    expect(saved).toMatchObject({
      units: 'lb', experienceMode: 'full', onboardingCompleted: true,
      programStateDefaults: { squat_one_rep_max: 220, bench_press_one_rep_max: null },
      displayName: 'Nate', rounding: 5, themePreference: 'dark', equipmentProfile: ['barbell'],
      timezone: 'Asia/Singapore', sex: 'female', autoStartTimer: false, defaultRestSeconds: 180,
      liveOnboardingDismissed: true, postWorkoutFeedbackDismissed: true,
      showFormulas: true, fullModeHintDismissedAt: firstStamp,
    })
    expect(stub.tables.profiles[1]).toEqual(other)
    // The authoritative update row is sufficient: no follow-up profile read can fail.
    expect(stub.fromCalls).toEqual(['profiles', 'profiles'])
  })

  it('leaves stored estimates untouched when units stay the same', async () => {
    const original = profile()
    const { ctx, stub } = makeStubCtx({ profiles: [original] })

    await completeFirstRun(ctx, { units: 'kg', experienceMode: 'full' })

    expect(stub.updateCalls[0].values).toEqual({
      units: 'kg', experience_mode: 'full', onboarding_completed: true,
    })
    expect(stub.tables.profiles[0].program_state_defaults).toBe(original.program_state_defaults)
  })

  it('returns a completed profile without overwriting settings from after first run', async () => {
    const original = { ...profile(), onboarding_completed: true }
    const { ctx, stub } = makeStubCtx({ profiles: [original] })

    const saved = await completeFirstRun(ctx, input)

    expect(saved).toMatchObject({ units: 'kg', experienceMode: 'guided', onboardingCompleted: true })
    expect(stub.updateCalls).toHaveLength(0)
    expect(stub.tables.profiles[0]).toEqual(original)
  })

  it('rejects invalid or over-posted choices before accessing the profile', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })

    await expect(completeFirstRun(ctx, { ...input, userId: 'user-2' } as never)).rejects.toThrow()
    await expect(completeFirstRun(ctx, { ...input, units: 'stone' } as never)).rejects.toThrow()

    expect(stub.fromCalls).toHaveLength(0)
  })

  it('keeps onboarding incomplete on write failure and succeeds on an explicit retry', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    const read = stub.from('profiles')
    const update = stub.from('profiles')
    vi.spyOn(update, 'maybeSingle').mockResolvedValueOnce({ data: null, error: { message: 'Connection failed' } })
    vi.spyOn(stub, 'from').mockReturnValueOnce(read).mockReturnValueOnce(update)

    await expect(completeFirstRun(ctx, input)).rejects.toThrow('Connection failed')
    expect(stub.tables.profiles[0]).toMatchObject({ onboarding_completed: false, units: 'kg' })
    await expect(completeFirstRun(ctx, input)).resolves.toMatchObject({ onboardingCompleted: true, units: 'lb' })
    expect(stub.updateCalls).toHaveLength(1)
  })

  it.each([false, true])('recovers a lost response without replaying choices (later settings: %s)', async changedLater => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    const read = stub.from('profiles')
    const update = stub.from('profiles')
    const commit = update.maybeSingle.bind(update)
    vi.spyOn(update, 'maybeSingle').mockImplementationOnce(async () => {
      await commit()
      return { data: null, error: { message: 'Response lost' } }
    })
    vi.spyOn(stub, 'from').mockReturnValueOnce(read).mockReturnValueOnce(update)

    await expect(completeFirstRun(ctx, input)).rejects.toThrow('Response lost')
    if (changedLater) Object.assign(stub.tables.profiles[0], {
      units: 'kg', experience_mode: 'guided', program_state_defaults: { squat_one_rep_max: 130 },
      updated_at: nextStamp,
    })
    await expect(completeFirstRun(ctx, input)).resolves.toMatchObject({
      onboardingCompleted: true, units: changedLater ? 'kg' : 'lb',
      experienceMode: changedLater ? 'guided' : 'full',
      programStateDefaults: { squat_one_rep_max: changedLater ? 130 : 220 },
    })
    expect(stub.updateCalls).toHaveLength(1)
  })

  it.each([
    { units: 'kg', rounding: 2.5, estimate: 110, expected: 242.5 },
    { units: 'lb', rounding: 5, estimate: 245, expected: 245 },
  ])('preserves concurrent settings and converts from their current $units units', async latest => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    const read = stub.from('profiles')
    const update = stub.from('profiles')
    const commit = update.maybeSingle.bind(update)
    vi.spyOn(update, 'maybeSingle').mockImplementationOnce(async () => {
      Object.assign(stub.tables.profiles[0], {
        updated_at: nextStamp, units: latest.units, rounding: latest.rounding, theme_preference: 'light',
        program_state_defaults: { squat_one_rep_max: latest.estimate },
      })
      return commit()
    })
    vi.spyOn(stub, 'from').mockReturnValueOnce(read).mockReturnValueOnce(update)

    const saved = await completeFirstRun(ctx, input)

    expect(saved).toMatchObject({
      units: 'lb', rounding: latest.rounding, themePreference: 'light',
      programStateDefaults: { squat_one_rep_max: latest.expected }, onboardingCompleted: true,
    })
    expect(stub.updateCalls).toHaveLength(2)
    expect(stub.updateCalls[1].filters).toContainEqual(['updated_at', nextStamp])
  })

  it('returns a concurrent completion without overwriting its choices', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    const read = stub.from('profiles')
    const update = stub.from('profiles')
    const commit = update.maybeSingle.bind(update)
    vi.spyOn(update, 'maybeSingle').mockImplementationOnce(async () => {
      Object.assign(stub.tables.profiles[0], { onboarding_completed: true, updated_at: nextStamp })
      return commit()
    })
    vi.spyOn(stub, 'from').mockReturnValueOnce(read).mockReturnValueOnce(update)

    await expect(completeFirstRun(ctx, input)).resolves.toMatchObject({
      units: 'kg', experienceMode: 'guided', onboardingCompleted: true,
      programStateDefaults: { squat_one_rep_max: 100 },
    })
    expect(stub.updateCalls).toHaveLength(1)
  })

  it.each([false, true])('bounds conflicts and reconciles their final completion state (%s)', async completed => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    const from = stub.from.bind(stub)
    let revision = 0
    vi.spyOn(stub, 'from').mockImplementation(table => {
      const query = from(table)
      const update = query.update.bind(query)
      vi.spyOn(query, 'update').mockImplementation(values => {
        update(values)
        const commit = query.maybeSingle.bind(query)
        vi.spyOn(query, 'maybeSingle').mockImplementationOnce(async () => {
          stub.tables.profiles[0].updated_at = `revision-${++revision}`
          if (completed && revision === 3) stub.tables.profiles[0].onboarding_completed = true
          return commit()
        })
        return query
      })
      return query
    })

    if (completed) {
      await expect(completeFirstRun(ctx, input)).resolves.toMatchObject({ onboardingCompleted: true, units: 'kg' })
    } else {
      await expect(completeFirstRun(ctx, input)).rejects.toThrow('Your profile changed while saving. Please try again.')
    }
    expect(stub.updateCalls).toHaveLength(3)
    expect(stub.tables.profiles[0]).toMatchObject({ onboarding_completed: completed, units: 'kg' })
  })
})
