import { describe, expect, it, vi } from 'vitest'
import type { SettingsSectionInput } from '@sheetless/domain/account/schemas'
import { updateSettingsSection } from '@sheetless/data/account/settings-sections'
import { makeStubCtx, type TestRow, type TestSupabase } from './support/supabase-stub'

const firstStamp = '2026-09-28T01:00:00.000Z'
const nextStamp = '2026-09-28T01:01:00.000Z'
const profile = (): TestRow => ({
  id: 'user-1', email: 'member@example.test', display_name: 'Nate',
  units: 'kg', rounding: 2.5, updated_at: firstStamp,
  program_state_defaults: { squat_one_rep_max: 100, bench_press_one_rep_max: 60, future_estimate: 50 },
  equipment_profile: ['barbell', 'future_station'],
  theme_preference: 'dark', experience_mode: 'guided', sex: 'female',
  auto_start_timer: true, default_rest_seconds: 120,
  show_formulas: true, onboarding_completed: true, timezone: 'Asia/Singapore',
})

function beforeFirstCommit(stub: TestSupabase, change: () => void) {
  const read = stub.from('profiles')
  const update = stub.from('profiles')
  const commit = update.maybeSingle.bind(update)
  vi.spyOn(update, 'maybeSingle').mockImplementationOnce(async () => {
    change()
    return commit()
  })
  vi.spyOn(stub, 'from').mockReturnValueOnce(read).mockReturnValueOnce(update)
}

describe('updateSettingsSection', () => {
  it.each<{ input: SettingsSectionInput; patch: TestRow }>([
    { input: { section: 'you', themePreference: 'light' }, patch: { theme_preference: 'light' } },
    { input: { section: 'you', experienceMode: 'full' }, patch: { experience_mode: 'full' } },
    { input: { section: 'sex', sex: null }, patch: { sex: null } },
    { input: { section: 'workouts', autoStartTimer: false }, patch: { auto_start_timer: false } },
    { input: { section: 'workouts', defaultRestSeconds: 180 }, patch: { default_rest_seconds: 180 } },
  ])('saves only the changed $input.section fields and returns the update row', async ({ input, patch }) => {
    const original = profile()
    const other = { ...profile(), id: 'user-2' }
    const { ctx, stub } = makeStubCtx({ profiles: [{ ...original }, other] })

    const saved = await updateSettingsSection(ctx, input)

    expect(stub.updateCalls).toEqual([{
      table: 'profiles', values: patch, filters: [['id', 'user-1'], ['updated_at', firstStamp]],
    }])
    expect(stub.tables.profiles[0]).toEqual({ ...original, ...patch })
    expect(stub.tables.profiles[1]).toEqual(other)
    expect(saved).toMatchObject({ id: 'user-1', showFormulas: true, onboardingCompleted: true })
    expect(stub.fromCalls).toEqual(['profiles', 'profiles'])
  })

  it('merges fresh unknown equipment while replacing only supported selections', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    beforeFirstCommit(stub, () => Object.assign(stub.tables.profiles[0], {
      updated_at: nextStamp, equipment_profile: ['specialty_bars', 'future_station', 'new_station'],
      theme_preference: 'light',
    }))

    const saved = await updateSettingsSection(ctx, { section: 'equipment', equipmentProfile: ['box'] })

    expect(saved).toMatchObject({ equipmentProfile: ['box', 'future_station', 'new_station'], themePreference: 'light' })
    expect(stub.updateCalls).toHaveLength(2)
    expect(Object.keys(stub.updateCalls[1].values)).toEqual(['equipment_profile'])
  })

  it('can clear known equipment without erasing unknown identifiers', async () => {
    const { ctx } = makeStubCtx({ profiles: [profile()] })
    await expect(updateSettingsSection(ctx, { section: 'equipment', equipmentProfile: [] }))
      .resolves.toMatchObject({ equipmentProfile: ['future_station'] })
  })

  it('converts the freshest entire estimate map atomically with a unit change', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    beforeFirstCommit(stub, () => Object.assign(stub.tables.profiles[0], {
      updated_at: nextStamp, rounding: 5, theme_preference: 'light',
      program_state_defaults: { squat_one_rep_max: 110, bench_press_one_rep_max: null, future_estimate: 10 },
    }))

    const saved = await updateSettingsSection(ctx, { section: 'you', units: 'lb' })

    expect(saved).toMatchObject({
      units: 'lb', rounding: 5, themePreference: 'light',
      programStateDefaults: { squat_one_rep_max: 245, bench_press_one_rep_max: null, future_estimate: 20 },
    })
    expect(Object.keys(stub.updateCalls[1].values).sort()).toEqual(['program_state_defaults', 'units'])
    expect(stub.updateCalls[1].filters).toContainEqual(['updated_at', nextStamp])
  })

  it('converts captured starting-number input after a competing unit change without restoring old units', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    beforeFirstCommit(stub, () => Object.assign(stub.tables.profiles[0], {
      updated_at: nextStamp, units: 'lb', rounding: 5,
      program_state_defaults: { squat_one_rep_max: 220, bench_press_one_rep_max: 135, future_estimate: 110 },
    }))

    const saved = await updateSettingsSection(ctx, {
      section: 'starting-numbers', inputUnits: 'kg', programStateDefaults: { squat_one_rep_max: 110 },
    })

    expect(saved).toMatchObject({
      units: 'lb', rounding: 5,
      programStateDefaults: { squat_one_rep_max: 245, bench_press_one_rep_max: 135, future_estimate: 110 },
    })
    expect(Object.keys(stub.updateCalls[1].values)).toEqual(['program_state_defaults'])
  })

  it('merges only edited estimate keys, preserves explicit clears, and uses edited rounding for conversion', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    const saved = await updateSettingsSection(ctx, {
      section: 'starting-numbers', inputUnits: 'lb', rounding: 5,
      programStateDefaults: { squat_one_rep_max: 225, bench_press_one_rep_max: null },
    })
    expect(saved).toMatchObject({
      units: 'kg', rounding: 5,
      programStateDefaults: { squat_one_rep_max: 100, bench_press_one_rep_max: null, future_estimate: 50 },
    })
    expect(Object.keys(stub.updateCalls[0].values).sort()).toEqual(['program_state_defaults', 'rounding'])
  })

  it('changes rounding alone without rewriting saved estimates', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    await updateSettingsSection(ctx, {
      section: 'starting-numbers', inputUnits: 'kg', rounding: 5, programStateDefaults: {},
    })
    expect(stub.updateCalls[0].values).toEqual({ rounding: 5 })
  })

  it.each<SettingsSectionInput>([
    { section: 'you', units: 'lb' },
    { section: 'starting-numbers', inputUnits: 'kg', programStateDefaults: { squat_one_rep_max: 120 } },
  ])('an explicit retry after a lost $section response never converts a saved result twice', async input => {
    const initial = { ...profile(), ...(input.section === 'starting-numbers' ? { units: 'lb' } : {}) }
    const { ctx, stub } = makeStubCtx({ profiles: [initial] })
    const read = stub.from('profiles')
    const update = stub.from('profiles')
    const commit = update.maybeSingle.bind(update)
    vi.spyOn(update, 'maybeSingle').mockImplementationOnce(async () => {
      await commit()
      return { data: null, error: { message: 'Response lost' } }
    })
    vi.spyOn(stub, 'from').mockReturnValueOnce(read).mockReturnValueOnce(update)

    await expect(updateSettingsSection(ctx, input)).rejects.toThrow('Response lost')
    const committed = { ...(stub.tables.profiles[0].program_state_defaults as TestRow) }
    Object.assign(stub.tables.profiles[0], { updated_at: nextStamp, theme_preference: 'light' })
    const saved = await updateSettingsSection(ctx, input)

    expect(saved).toMatchObject({ units: 'lb', themePreference: 'light', programStateDefaults: committed })
    if (input.section === 'you') expect(stub.updateCalls[1].values).toEqual({ units: 'lb' })
  })

  it('preserves changes from another section when a revision conflict requires retry', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    beforeFirstCommit(stub, () => Object.assign(stub.tables.profiles[0], {
      updated_at: nextStamp, units: 'lb', experience_mode: 'full', default_rest_seconds: 180,
    }))
    await expect(updateSettingsSection(ctx, { section: 'you', themePreference: 'light' }))
      .resolves.toMatchObject({ units: 'lb', experienceMode: 'full', defaultRestSeconds: 180, themePreference: 'light' })
    expect(stub.updateCalls.every(call => Object.keys(call.values).join() === 'theme_preference')).toBe(true)
  })

  it('bounds revision retries and leaves a persistent conflict for an explicit retry', async () => {
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
          return commit()
        })
        return query
      })
      return query
    })
    await expect(updateSettingsSection(ctx, { section: 'sex', sex: null }))
      .rejects.toThrow('Your profile changed while saving. Please try again.')
    expect(stub.updateCalls).toHaveLength(3)
    expect(stub.tables.profiles[0].sex).toBe('female')
  })

  it('validates scoped input before reading or writing the database', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    await expect(updateSettingsSection(ctx, { section: 'you', units: 'lb', showFormulas: false } as never)).rejects.toThrow()
    expect(stub.fromCalls).toHaveLength(0)
  })

  it('refuses to save when the supplied account changes during the read', async () => {
    const { ctx, stub } = makeStubCtx({ profiles: [profile()] })
    const read = stub.from('profiles')
    const get = read.maybeSingle.bind(read)
    vi.spyOn(read, 'maybeSingle').mockImplementationOnce(async () => {
      const result = await get()
      ctx.user = { ...ctx.user, id: 'user-2' }
      return result
    })
    vi.spyOn(stub, 'from').mockReturnValueOnce(read)
    await expect(updateSettingsSection(ctx, { section: 'sex', sex: null })).rejects.toThrow('Your account changed.')
    expect(stub.updateCalls).toHaveLength(0)
  })
})
