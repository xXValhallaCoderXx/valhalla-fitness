import { EQUIPMENT_PROFILE_OPTIONS } from '@sheetless/domain/account/equipment-profile'
import {
  updateSettingsSectionInputSchema,
  type SettingsSectionInput,
} from '@sheetless/domain/account/schemas'
import { convertProgramStateDefaults } from '@sheetless/domain/account/settings-form'
import type { UserProfile } from '@sheetless/domain/account/types'
import type { TablesUpdate } from '@sheetless/domain/shared/types/database'
import type { UserContext } from '../shared/context'
import { ensureProfile, profileFromRow } from './profile'

const knownEquipment = new Set<string>(EQUIPMENT_PROFILE_OPTIONS)

function buildSectionPatch(profile: UserProfile, input: SettingsSectionInput): TablesUpdate<'profiles'> {
  switch (input.section) {
    case 'you':
      return {
        ...(input.themePreference !== undefined ? { theme_preference: input.themePreference } : {}),
        ...(input.experienceMode !== undefined ? { experience_mode: input.experienceMode } : {}),
        ...(input.units !== undefined ? { units: input.units } : {}),
        ...(input.units !== undefined && input.units !== profile.units ? {
          program_state_defaults: convertProgramStateDefaults(
            profile.programStateDefaults, profile.units, input.units, profile.rounding,
          ),
        } : {}),
      }
    case 'sex':
      return { sex: input.sex }
    case 'equipment':
      return {
        equipment_profile: [
          ...input.equipmentProfile,
          ...profile.equipmentProfile.filter(value => !knownEquipment.has(value)),
        ],
      }
    case 'starting-numbers':
      return {
        ...(input.rounding !== undefined ? { rounding: input.rounding } : {}),
        ...(Object.keys(input.programStateDefaults).length ? {
          program_state_defaults: {
            ...profile.programStateDefaults,
            ...convertProgramStateDefaults(
              input.programStateDefaults, input.inputUnits, profile.units, input.rounding ?? profile.rounding,
            ),
          },
        } : {}),
      }
    case 'workouts':
      return {
        ...(input.autoStartTimer !== undefined ? { auto_start_timer: input.autoStartTimer } : {}),
        ...(input.defaultRestSeconds !== undefined ? { default_rest_seconds: input.defaultRestSeconds } : {}),
      }
  }
}

/** Merge an editor's changes with the latest profile, retrying only compare-and-swap conflicts. */
export async function updateSettingsSection(ctx: UserContext, input: SettingsSectionInput): Promise<UserProfile> {
  const parsed = updateSettingsSectionInputSchema.parse(input)
  const userId = ctx.user.id
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await ensureProfile(ctx)
    if (row.id !== userId || ctx.user.id !== userId) throw new Error('Your account changed. Reopen settings to continue.')
    if (typeof row.updated_at !== 'string' || !row.updated_at) throw new Error('Your profile could not be refreshed. Please try again.')
    const { data: saved, error } = await ctx.supabase
      .from('profiles')
      .update(buildSectionPatch(profileFromRow(row), parsed))
      .eq('id', userId)
      .eq('updated_at', row.updated_at)
      .select('*')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (saved) {
      if (saved.id !== userId || ctx.user.id !== userId) throw new Error('Your account changed. Reopen settings to continue.')
      return profileFromRow(saved)
    }
  }
  throw new Error('Your profile changed while saving. Please try again.')
}
