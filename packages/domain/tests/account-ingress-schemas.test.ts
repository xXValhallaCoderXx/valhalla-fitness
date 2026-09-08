import { describe, expect, it } from 'vitest'
import {
  bodyweightLogInputSchema,
  deleteBodyweightEntryInputSchema,
  emailAuthInputSchema,
  exchangeCodeInputSchema,
  passwordAuthInputSchema,
  setSessionFromTokensInputSchema,
  updateSettingsInputSchema,
  updateSexInputSchema,
  updateTimezoneInputSchema,
  verifyEmailOtpInputSchema,
} from '@sheetless/domain/account/schemas'

const validSettings = {
  units: 'kg' as const,
  rounding: 2.5,
  equipmentProfile: ['barbell', 'plates', 'rack'],
  themePreference: 'system' as const,
  programStateDefaults: {
    squat_one_rep_max: 120,
    bench_press_one_rep_max: null,
  },
}

describe('account auth ingress schemas', () => {
  it('normalizes email without altering the password', () => {
    expect(
      passwordAuthInputSchema.parse({
        email: ' Demo.Linear@Sheetless.Local ',
        password: ' Passphrase with spaces ',
      }),
    ).toEqual({
      email: 'demo.linear@sheetless.local',
      password: ' Passphrase with spaces ',
    })
  })

  it('accepts the email-only auth payload and rejects malformed or extra input', () => {
    expect(emailAuthInputSchema.parse({ email: ' PERSON@example.com ' })).toEqual({
      email: 'person@example.com',
    })
    expect(emailAuthInputSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
    expect(emailAuthInputSchema.safeParse({ email: 'person@example.com', redirectTo: 'https://example.com' }).success)
      .toBe(false)
    expect(emailAuthInputSchema.safeParse({ email: `${'a'.repeat(245)}@example.com` }).success).toBe(false)
  })

  it('bounds password and callback code input', () => {
    expect(passwordAuthInputSchema.safeParse({ email: 'person@example.com', password: '' }).success).toBe(false)
    expect(passwordAuthInputSchema.safeParse({ email: 'person@example.com', password: 'x'.repeat(1_025) }).success)
      .toBe(false)
    expect(exchangeCodeInputSchema.parse({ code: ' auth-code ' })).toEqual({ code: 'auth-code' })
    expect(exchangeCodeInputSchema.safeParse({ code: '' }).success).toBe(false)
    expect(exchangeCodeInputSchema.safeParse({ code: 'x'.repeat(4_097) }).success).toBe(false)
  })

  it('accepts only supported email-link OTP modes and strict token payloads', () => {
    for (const type of ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const) {
      expect(verifyEmailOtpInputSchema.safeParse({ tokenHash: 'token-hash', type }).success).toBe(true)
    }

    expect(verifyEmailOtpInputSchema.safeParse({ tokenHash: 'token-hash', type: 'sms' }).success).toBe(false)
    expect(
      verifyEmailOtpInputSchema.safeParse({
        tokenHash: 'token-hash',
        type: 'magiclink',
        next: '/today',
      }).success,
    ).toBe(false)

    expect(
      setSessionFromTokensInputSchema.parse({
        accessToken: ' access-token ',
        refreshToken: ' refresh-token ',
      }),
    ).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    expect(
      setSessionFromTokensInputSchema.safeParse({
        accessToken: 'access-token',
        refreshToken: '',
      }).success,
    ).toBe(false)
  })
})

describe('account profile ingress schemas', () => {
  it('accepts the full settings form and the partial quick-unit payload', () => {
    expect(
      updateSettingsInputSchema.safeParse({
        ...validSettings,
        sex: 'female',
        autoStartTimer: true,
        defaultRestSeconds: 120,
      }).success,
    ).toBe(true)
    expect(updateSettingsInputSchema.parse(validSettings)).toEqual(validSettings)
  })

  it('accepts the experience settings as optional keys', () => {
    const withExperience = { ...validSettings, experienceMode: 'full' as const, showFormulas: true }
    expect(updateSettingsInputSchema.parse(withExperience)).toEqual(withExperience)
  })

  it('rejects unknown fields, invalid enums, duplicates, and out-of-range numbers', () => {
    expect(updateSettingsInputSchema.safeParse({ ...validSettings, userId: crypto.randomUUID() }).success).toBe(false)
    expect(updateSettingsInputSchema.safeParse({ ...validSettings, units: 'stone' }).success).toBe(false)
    expect(updateSettingsInputSchema.safeParse({ ...validSettings, themePreference: 'contrast' }).success).toBe(false)
    expect(updateSettingsInputSchema.safeParse({ ...validSettings, experienceMode: 'wizard' }).success).toBe(false)
    expect(updateSettingsInputSchema.safeParse({ ...validSettings, showFormulas: 'yes' }).success).toBe(false)
    // The dismissal stamp is written by its own server fn, never through the settings form.
    expect(updateSettingsInputSchema.safeParse({ ...validSettings, fullModeHintDismissedAt: null }).success).toBe(false)
    expect(updateSettingsInputSchema.safeParse({ ...validSettings, rounding: Number.POSITIVE_INFINITY }).success)
      .toBe(false)
    expect(updateSettingsInputSchema.safeParse({ ...validSettings, defaultRestSeconds: 29 }).success).toBe(false)
    expect(
      updateSettingsInputSchema.safeParse({
        ...validSettings,
        equipmentProfile: ['barbell', 'barbell'],
      }).success,
    ).toBe(false)
    expect(
      updateSettingsInputSchema.safeParse({
        ...validSettings,
        programStateDefaults: { squat_one_rep_max: -1 },
      }).success,
    ).toBe(false)
  })

  it('bounds the size of programme defaults', () => {
    const tooManyDefaults = Object.fromEntries(
      Array.from({ length: 501 }, (_, index) => [`state_${index}`, null]),
    )
    expect(
      updateSettingsInputSchema.safeParse({
        ...validSettings,
        programStateDefaults: tooManyDefaults,
      }).success,
    ).toBe(false)
  })

  it('validates nullable sex and canonicalizes IANA timezones', () => {
    expect(updateSexInputSchema.parse({ sex: null })).toEqual({ sex: null })
    expect(updateSexInputSchema.safeParse({ sex: 'other' }).success).toBe(false)
    expect(updateSexInputSchema.safeParse({ sex: 'male', userId: crypto.randomUUID() }).success).toBe(false)

    expect(updateTimezoneInputSchema.parse({ timezone: ' Asia/Singapore ' })).toEqual({
      timezone: 'Asia/Singapore',
    })
    expect(updateTimezoneInputSchema.safeParse({ timezone: 'Mars/Olympus' }).success).toBe(false)
    expect(updateTimezoneInputSchema.safeParse({ timezone: 'UTC', offset: 0 }).success).toBe(false)
  })
})

describe('bodyweight ingress schemas', () => {
  it('accepts strict log payloads with real calendar dates', () => {
    expect(
      bodyweightLogInputSchema.parse({
        weight: 82.5,
        unit: 'kg',
        recordedOn: '2024-02-29',
      }),
    ).toEqual({
      weight: 82.5,
      unit: 'kg',
      recordedOn: '2024-02-29',
    })
    expect(bodyweightLogInputSchema.safeParse({ weight: 180, unit: 'lb' }).success).toBe(true)
  })

  it('rejects impossible dates, unbounded numbers, enums, and unknown fields', () => {
    expect(bodyweightLogInputSchema.safeParse({ weight: 82.5, unit: 'kg', recordedOn: '2026-02-29' }).success)
      .toBe(false)
    expect(bodyweightLogInputSchema.safeParse({ weight: Number.NaN, unit: 'kg' }).success).toBe(false)
    expect(bodyweightLogInputSchema.safeParse({ weight: 2_001, unit: 'kg' }).success).toBe(false)
    expect(bodyweightLogInputSchema.safeParse({ weight: 82.5, unit: 'stone' }).success).toBe(false)
    expect(bodyweightLogInputSchema.safeParse({ weight: 82.5, unit: 'kg', userId: crypto.randomUUID() }).success)
      .toBe(false)
  })

  it('requires UUID entity IDs for deletion', () => {
    const id = '87f3f0e0-1f6e-4d4f-9c7c-4d88792f3a6e'
    expect(deleteBodyweightEntryInputSchema.parse({ id })).toEqual({ id })
    expect(deleteBodyweightEntryInputSchema.safeParse({ id: 'entry-1' }).success).toBe(false)
    expect(deleteBodyweightEntryInputSchema.safeParse({ id, userId: crypto.randomUUID() }).success).toBe(false)
  })
})
