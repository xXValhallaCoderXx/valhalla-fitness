import { z } from 'zod'
import { normalizeIanaTimeZone } from '~/shared/lib/calendar-date'

const email = z.string().trim().toLowerCase().max(254).email()
const password = z.string().min(1).max(1_024)
const authCode = z.string().trim().min(1).max(4_096)
const authToken = z.string().trim().min(1).max(16_384)
const databaseId = z.string().uuid()
const unit = z.enum(['kg', 'lb'])
const themePreference = z.enum(['system', 'dark', 'light'])
const sex = z.enum(['male', 'female'])
const equipmentIdentifier = z.string().trim().min(1).max(100)
const programStateKey = z.string().trim().min(1).max(200)
const programStateDefault = z.number().finite().positive().max(100_000).nullable()

const programStateDefaults = z
  .record(programStateKey, programStateDefault)
  .superRefine((values, context) => {
    if (Object.keys(values).length > 500) {
      context.addIssue({
        code: 'custom',
        message: 'Programme defaults cannot contain more than 500 entries.',
      })
    }
  })

const equipmentProfile = z
  .array(equipmentIdentifier)
  .max(100)
  .superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: 'custom',
        message: 'Equipment profile cannot contain duplicate entries.',
      })
    }
  })

export const passwordAuthInputSchema = z
  .object({
    email,
    password,
  })
  .strict()

export const emailAuthInputSchema = z
  .object({
    email,
  })
  .strict()

export const exchangeCodeInputSchema = z
  .object({
    code: authCode,
  })
  .strict()

export const verifyEmailOtpInputSchema = z
  .object({
    tokenHash: authToken,
    type: z.enum(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']),
  })
  .strict()

export const setSessionFromTokensInputSchema = z
  .object({
    accessToken: authToken,
    refreshToken: authToken,
  })
  .strict()

export const updateSettingsInputSchema = z
  .object({
    units: unit,
    rounding: z.number().finite().positive().max(1_000),
    equipmentProfile,
    themePreference,
    programStateDefaults,
    sex: sex.nullable().optional(),
    autoStartTimer: z.boolean().optional(),
    defaultRestSeconds: z.number().int().min(30).max(600).optional(),
  })
  .strict()

export const updateSexInputSchema = z
  .object({
    sex: sex.nullable(),
  })
  .strict()

export const updateTimezoneInputSchema = z
  .object({
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .transform((value, context) => {
        const timezone = normalizeIanaTimeZone(value)
        if (!timezone) {
          context.addIssue({
            code: 'custom',
            message: 'Invalid IANA timezone',
          })
          return z.NEVER
        }
        return timezone
      }),
  })
  .strict()

export const bodyweightLogInputSchema = z
  .object({
    weight: z.number().finite().positive().max(2_000),
    unit,
    recordedOn: z
      .string()
      .refine(isCalendarDate, 'Use a calendar date in YYYY-MM-DD format.')
      .optional(),
  })
  .strict()

export const deleteBodyweightEntryInputSchema = z
  .object({
    id: databaseId,
  })
  .strict()

export type BodyweightLogInput = z.infer<typeof bodyweightLogInputSchema>

export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}
