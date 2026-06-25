import { createServerFn } from '@tanstack/react-start'
import type { ProgramStateDefaults, ThemePreference, Unit, UserProfile } from '~/shared/types'
import { defaultProgramStateDefaults } from '~/domains/program/lib/templates'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

export async function ensureProfile() {
  const { supabase, user } = await requireUser()
  const email = user.email ?? null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (profile) return profile
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, email, units: 'kg', rounding: 2.5, theme_preference: 'system' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
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

export const getMeFn = createServerFn({ method: 'GET' }).handler(async (): Promise<UserProfile | null> => {
  if (!(await hasSupabaseEnv())) return null
  let profile
  try {
    profile = await ensureProfile()
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') return null
    throw error
  }
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    units: profile.units as Unit,
    rounding: Number(profile.rounding),
    equipmentProfile: profile.equipment_profile ?? [],
    themePreference: (profile.theme_preference ?? 'system') as ThemePreference,
    programStateDefaults: normalizeProgramStateDefaults(profile.program_state_defaults, profile.units as Unit),
  }
})

export const updateSettingsFn = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      units: Unit
      rounding: number
      equipmentProfile: string[]
      themePreference: ThemePreference
      programStateDefaults: ProgramStateDefaults
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()
    const programStateDefaults = normalizeProgramStateDefaults(data.programStateDefaults, data.units)
    const { error } = await supabase
      .from('profiles')
      .update({
        units: data.units,
        rounding: data.rounding,
        equipment_profile: data.equipmentProfile,
        theme_preference: data.themePreference,
        program_state_defaults: programStateDefaults,
      })
      .eq('id', user.id)
    if (error) throw new Error(error.message)
    return getMeFn()
  })
