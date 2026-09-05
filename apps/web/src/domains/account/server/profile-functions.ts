import { createServerFn } from '@tanstack/react-start'
import {
  updateSettingsInputSchema,
  updateSexInputSchema,
  updateTimezoneInputSchema,
} from '~/domains/account/lib/schemas'
import type { UserProfile } from '~/domains/account'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

// @sheetless/data is loaded dynamically: this module exports the plain
// ensureProfile helper alongside server fns, so a static import would survive
// the client transform and pull the data package into the client bundle.
async function profileData() {
  return import('@sheetless/data/account/profile')
}

/** Web-signature shim: acquires the cookie-authenticated context itself. */
export async function ensureProfile() {
  const { ensureProfile } = await profileData()
  return ensureProfile(await requireUser())
}

export const getMeFn = createServerFn({ method: 'GET' }).handler(async (): Promise<UserProfile | null> => {
  if (!(await hasSupabaseEnv())) return null
  try {
    const { getMe } = await profileData()
    return await getMe(await requireUser())
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') return null
    throw error
  }
})

export const completeOnboardingFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { completeOnboarding } = await profileData()
  return completeOnboarding(await requireUser())
})

export const dismissLiveOnboardingFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { dismissLiveOnboarding } = await profileData()
  return dismissLiveOnboarding(await requireUser())
})

export const dismissPostWorkoutFeedbackFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { dismissPostWorkoutFeedback } = await profileData()
  return dismissPostWorkoutFeedback(await requireUser())
})

export const updateSettingsFn = createServerFn({ method: 'POST' })
  .validator((data) => updateSettingsInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { updateSettings } = await profileData()
    return updateSettings(await requireUser(), data)
  })

export const updateSexFn = createServerFn({ method: 'POST' })
  .validator((data) => updateSexInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { updateSex } = await profileData()
    return updateSex(await requireUser(), data)
  })

export const updateTimezoneFn = createServerFn({ method: 'POST' })
  .validator((data) => updateTimezoneInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { updateTimezone } = await profileData()
    return updateTimezone(await requireUser(), data)
  })
