import type { RequiredEquipment } from '@sheetless/domain/movement/types'

export const EQUIPMENT_PROFILE_OPTIONS = [
  'barbell',
  'dumbbells',
  'specialty_bar',
  'rack',
  'bench',
  'plates',
  'pull_up_bar',
  'dip_bars',
  'cable',
  'machine',
  'smith_machine',
  'landmine',
  'box',
  'ab_wheel',
  'sliders',
  'bodyweight',
] as const satisfies readonly RequiredEquipment[]

const legacyEquipmentAliases: Record<string, RequiredEquipment> = {
  blocks: 'box',
  specialty_bars: 'specialty_bar',
}

function normalizeEquipmentIdentifier(value: string) {
  const trimmed = value.trim()
  return legacyEquipmentAliases[trimmed] ?? trimmed
}

/**
 * Canonicalize known legacy identifiers while retaining future or account-specific values.
 * The first occurrence wins so a legacy/canonical pair cannot survive as a duplicate.
 */
export function normalizeEquipmentProfile(profile: readonly string[]): string[] {
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const value of profile) {
    const identifier = normalizeEquipmentIdentifier(value)
    if (!identifier || seen.has(identifier)) continue
    seen.add(identifier)
    normalized.push(identifier)
  }
  return normalized
}

/** An empty equipment profile is the backwards-compatible "all equipment" state. */
export function isEquipmentProfileCompatible(
  requiredEquipment: readonly RequiredEquipment[],
  profile: readonly string[],
) {
  const available = normalizeEquipmentProfile(profile)
  if (available.length === 0) return true
  const availableSet = new Set(available)
  return normalizeEquipmentProfile(requiredEquipment).every((item) =>
    availableSet.has(item),
  )
}

export function toggleEquipmentProfileItem(
  profile: readonly string[],
  item: RequiredEquipment,
) {
  const normalized = normalizeEquipmentProfile(profile)
  return normalized.includes(item)
    ? normalized.filter((value) => value !== item)
    : [...normalized, item]
}

export function countSelectedEquipmentProfileOptions(profile: readonly string[]) {
  const selected = new Set(normalizeEquipmentProfile(profile))
  return EQUIPMENT_PROFILE_OPTIONS.filter((item) => selected.has(item)).length
}
