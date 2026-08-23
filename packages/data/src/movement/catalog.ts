import type {
  AccessoryMovementOption,
  Movement,
  MovementReplacementRule,
} from '@sheetless/domain/movement/types'
import type { Tables } from '@sheetless/domain/shared/types/database'
import {
  defaultMovementReplacementRules,
  isActiveMovement,
  isFreeWeightMovement,
  movementCatalog,
} from '@sheetless/domain/movement/movements'
import type { DataClient, UserContext } from '../shared/context'

function mapMovementReplacementRule(row: Tables<'movement_replacement_rules'>): MovementReplacementRule {
  return {
    id: row.id,
    sourceMovementId: row.source_movement_id,
    replacementMovementId: row.replacement_movement_id,
    role: row.role as MovementReplacementRule['role'],
    templateId: row.template_id,
    phaseKey: row.phase_key,
    slotId: row.slot_id,
    relationshipLabel: row.relationship_label,
    allowSessionScope: row.allow_session_scope,
    allowPhaseSlotScope: row.allow_phase_slot_scope,
  }
}

function mapMovementRow(row: Tables<'movements'>): Movement {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Movement['category'],
    equipment: row.equipment ?? [],
    variationOf: row.variation_of,
    defaultUnit: row.default_unit as Movement['defaultUnit'],
    isCompetition: row.is_competition,
    status: row.status as Movement['status'],
    resistanceMode: row.resistance_mode as Movement['resistanceMode'],
    requiredEquipment: row.required_equipment as Movement['requiredEquipment'],
    pattern: row.pattern as Movement['pattern'],
    primaryMuscles: row.primary_muscles as Movement['primaryMuscles'],
    secondaryMuscles: row.secondary_muscles as Movement['secondaryMuscles'],
    aliases: row.aliases,
    loadConvention: row.load_convention as Movement['loadConvention'],
    replacedByMovementId: row.replaced_by_movement_id,
    canonicalFreeWeightMovementId: row.canonical_free_weight_movement_id,
  }
}

export async function getMovementCatalogForSwap(supabase: DataClient): Promise<Record<string, Movement>> {
  const { data, error } = await supabase.from('movements').select('*')
  if (error) throw new Error(error.message)
  const catalog = Object.fromEntries((data ?? []).map((row) => [row.id, mapMovementRow(row)]))
  return Object.keys(catalog).length ? catalog : movementCatalog
}

export async function getReplacementRulesForSwap(supabase: DataClient): Promise<MovementReplacementRule[]> {
  const { data, error } = await supabase
    .from('movement_replacement_rules')
    .select('*')
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  const rules = (data ?? []).map(mapMovementReplacementRule)
  return rules.length ? rules : defaultMovementReplacementRules
}

export function listAccessoryMovementOptionsFromCatalog(catalog: Record<string, Movement>): AccessoryMovementOption[] {
  return Object.values(catalog)
    .filter((movement) => isActiveMovement(movement) && !movement.isCompetition)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((movement) => ({
      movementId: movement.id,
      movementName: movement.name,
      category: movement.category,
      equipment: movement.equipment,
      defaultUnit: movement.defaultUnit,
      freeWeightCompatible: isFreeWeightMovement(movement),
    }))
}

export async function listAccessoryMovementOptions(
  ctx: UserContext,
): Promise<AccessoryMovementOption[]> {
  const catalog = await getMovementCatalogForSwap(ctx.supabase)
  return listAccessoryMovementOptionsFromCatalog(catalog)
}

// Full catalog for ad-hoc workouts — competition lifts included and surfaced first.
export function listMovementOptionsFromCatalog(catalog: Record<string, Movement>): AccessoryMovementOption[] {
  return Object.values(catalog)
    .filter(isActiveMovement)
    .sort((left, right) => {
      if (left.isCompetition !== right.isCompetition) return left.isCompetition ? -1 : 1
      return left.name.localeCompare(right.name)
    })
    .map((movement) => ({
      movementId: movement.id,
      movementName: movement.name,
      category: movement.category,
      equipment: movement.equipment,
      defaultUnit: movement.defaultUnit,
      freeWeightCompatible: isFreeWeightMovement(movement),
    }))
}

export async function listMovementOptions(
  ctx: UserContext,
): Promise<AccessoryMovementOption[]> {
  const catalog = await getMovementCatalogForSwap(ctx.supabase)
  return listMovementOptionsFromCatalog(catalog)
}
