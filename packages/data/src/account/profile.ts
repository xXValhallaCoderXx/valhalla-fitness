import type { z } from 'zod'
import {
  updateSettingsInputSchema,
  updateSexInputSchema,
  updateTimezoneInputSchema,
} from '@sheetless/domain/account/schemas'
import { normalizeEquipmentProfile } from '@sheetless/domain/account/equipment-profile'
import { defaultProgramStateDefaults } from '@sheetless/domain/program/program-state-defaults'
import { normalizeIanaTimeZone } from '@sheetless/domain/shared/calendar-date'
import type { ExperienceMode, Sex, ThemePreference, UserProfile } from '@sheetless/domain/account/types'
import type { ProgramStateDefaults, Unit } from '@sheetless/domain/shared/types'
import type { TablesUpdate } from '@sheetless/domain/shared/types/database'
import type { UserContext } from '../shared/context'

type ProfileRow = Record<string, unknown> & { id: string }

export async function ensureProfile(ctx: UserContext) {
  const { supabase, user } = ctx
  const email = user.email ?? null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (profile) return profile
  // OAuth providers (Google) put a name in user metadata — capture it so the profile has a display
  // name from the start. Magic-link users have none, so this stays null.
  const metadata = user.user_metadata ?? {}
  const displayName =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : null
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, email, display_name: displayName, units: 'kg', rounding: 2.5, theme_preference: 'system' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as ProfileRow
}

export function normalizeProgramStateDefaults(input: unknown, units: Unit): ProgramStateDefaults {
  const fallback = defaultProgramStateDefaults(units)
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fallback
  const values = input as Record<string, unknown>
  const normalized: ProgramStateDefaults = { ...fallback }
  for (const [key, rawValue] of Object.entries(values)) {
    normalized[key] = normalizeNullableLoadDefault(rawValue)
  }
  return normalized
}

function normalizeNullableLoadDefault(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

export async function getMe(ctx: UserContext): Promise<UserProfile> {
  const profile = await ensureProfile(ctx)
  return {
    id: profile.id as string,
    email: profile.email as string | null,
    displayName: profile.display_name as string | null,
    units: profile.units as Unit,
    rounding: Number(profile.rounding),
    equipmentProfile: normalizeEquipmentProfile(
      (profile.equipment_profile ?? []) as string[],
    ),
    themePreference: (profile.theme_preference ?? 'system') as ThemePreference,
    timezone: normalizeIanaTimeZone(profile.timezone),
    programStateDefaults: normalizeProgramStateDefaults(profile.program_state_defaults, profile.units as Unit),
    onboardingCompleted: Boolean(profile.onboarding_completed),
    liveOnboardingDismissed: Boolean(profile.live_onboarding_dismissed),
    postWorkoutFeedbackDismissed: Boolean(profile.post_workout_feedback_dismissed),
    sex: (profile.sex ?? null) as Sex | null,
    autoStartTimer: (profile.auto_start_timer ?? true) as boolean,
    defaultRestSeconds: Number(profile.default_rest_seconds ?? 120),
    experienceMode: (profile.experience_mode ?? 'guided') as ExperienceMode,
    showFormulas: Boolean(profile.show_formulas),
    fullModeHintDismissedAt: (profile.full_mode_hint_dismissed_at ?? null) as string | null,
  }
}

async function updateProfile(ctx: UserContext, values: TablesUpdate<'profiles'>) {
  const { error } = await ctx.supabase.from('profiles').update(values).eq('id', ctx.user.id)
  if (error) throw new Error(error.message)
  return getMe(ctx)
}

export function completeOnboarding(ctx: UserContext) {
  return updateProfile(ctx, { onboarding_completed: true })
}

export function dismissLiveOnboarding(ctx: UserContext) {
  return updateProfile(ctx, { live_onboarding_dismissed: true })
}

export function dismissPostWorkoutFeedback(ctx: UserContext) {
  return updateProfile(ctx, { post_workout_feedback_dismissed: true })
}

/** Answers the one-time "Full mode is ready" hint, whichever action the lifter chose. */
export function dismissFullModeHint(ctx: UserContext) {
  return updateProfile(ctx, { full_mode_hint_dismissed_at: new Date().toISOString() })
}

/** Clears the stamp so Settings › Experience can put the hint back. */
export function restoreFullModeHint(ctx: UserContext) {
  return updateProfile(ctx, { full_mode_hint_dismissed_at: null })
}

export async function updateSettings(ctx: UserContext, data: z.infer<typeof updateSettingsInputSchema>) {
  const parsed = updateSettingsInputSchema.parse(data)
  const programStateDefaults = normalizeProgramStateDefaults(parsed.programStateDefaults, parsed.units)
  return updateProfile(ctx, {
    units: parsed.units,
    rounding: parsed.rounding,
    equipment_profile: normalizeEquipmentProfile(parsed.equipmentProfile),
    theme_preference: parsed.themePreference,
    program_state_defaults: programStateDefaults,
    ...(parsed.sex !== undefined ? { sex: parsed.sex } : {}),
    ...(parsed.autoStartTimer !== undefined ? { auto_start_timer: parsed.autoStartTimer } : {}),
    ...(parsed.defaultRestSeconds !== undefined ? { default_rest_seconds: parsed.defaultRestSeconds } : {}),
    ...(parsed.experienceMode !== undefined ? { experience_mode: parsed.experienceMode } : {}),
    ...(parsed.showFormulas !== undefined ? { show_formulas: parsed.showFormulas } : {}),
  })
}

export async function updateSex(ctx: UserContext, data: z.infer<typeof updateSexInputSchema>) {
  const parsed = updateSexInputSchema.parse(data)
  return updateProfile(ctx, { sex: parsed.sex })
}

export async function updateTimezone(ctx: UserContext, data: z.infer<typeof updateTimezoneInputSchema>) {
  const parsed = updateTimezoneInputSchema.parse(data)
  return updateProfile(ctx, { timezone: parsed.timezone })
}
