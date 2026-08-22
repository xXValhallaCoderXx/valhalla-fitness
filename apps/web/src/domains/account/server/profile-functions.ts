import { createServerFn } from '@tanstack/react-start'
import {
  completeOnboarding,
  dismissLiveOnboarding,
  dismissPostWorkoutFeedback,
  getMe,
  ensureProfile as ensureProfileData,
  updateSettings,
  updateSex,
  updateTimezone,
} from '@sheetless/data/account/profile'
import {
  updateSettingsInputSchema,
  updateSexInputSchema,
  updateTimezoneInputSchema,
} from '~/domains/account/lib/schemas'
import type { UserProfile } from '~/domains/account'

export { normalizeProgramStateDefaults } from '@sheetless/data/account/profile'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

/** Web-signature shim: acquires the cookie-authenticated context itself. */
export async function ensureProfile() {
  return ensureProfileData(await requireUser())
}

export const getMeFn = createServerFn({ method: 'GET' }).handler(async (): Promise<UserProfile | null> => {
  if (!(await hasSupabaseEnv())) return null
  try {
    return await getMe(await requireUser())
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') return null
    throw error
  }
})

export const completeOnboardingFn = createServerFn({ method: 'POST' }).handler(async () =>
  completeOnboarding(await requireUser()))

export const dismissLiveOnboardingFn = createServerFn({ method: 'POST' }).handler(async () =>
  dismissLiveOnboarding(await requireUser()))

export const dismissPostWorkoutFeedbackFn = createServerFn({ method: 'POST' }).handler(async () =>
  dismissPostWorkoutFeedback(await requireUser()))

export const updateSettingsFn = createServerFn({ method: 'POST' })
  .validator((data) => updateSettingsInputSchema.parse(data))
  .handler(async ({ data }) => updateSettings(await requireUser(), data))

export const updateSexFn = createServerFn({ method: 'POST' })
  .validator((data) => updateSexInputSchema.parse(data))
  .handler(async ({ data }) => updateSex(await requireUser(), data))

export const updateTimezoneFn = createServerFn({ method: 'POST' })
  .validator((data) => updateTimezoneInputSchema.parse(data))
  .handler(async ({ data }) => updateTimezone(await requireUser(), data))
