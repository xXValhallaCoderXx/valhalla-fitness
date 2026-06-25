import { createServerFn } from '@tanstack/react-start'
import type { AccessoryMovementOption, Movement, MovementReplacementRule } from '~/shared/types'
import { defaultMovementReplacementRules, movementCatalog } from '~/domains/movement/lib/movements'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

function mapMovementReplacementRule(row: any): MovementReplacementRule {
  return {
    id: row.id,
    sourceMovementId: row.source_movement_id,
    replacementMovementId: row.replacement_movement_id,
    role: row.role,
    templateId: row.template_id,
    phaseKey: row.phase_key,
    slotId: row.slot_id,
    relationshipLabel: row.relationship_label,
    allowSessionScope: row.allow_session_scope,
    allowPhaseSlotScope: row.allow_phase_slot_scope,
  }
}

function mapMovementRow(row: any): Movement {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    equipment: row.equipment ?? [],
    variationOf: row.variation_of,
    defaultUnit: row.default_unit,
    isCompetition: row.is_competition,
  }
}

export async function getMovementCatalogForSwap(supabase: any): Promise<Record<string, Movement>> {
  const { data, error } = await supabase.from('movements').select('*')
  if (error) throw new Error(error.message)
  const catalog = Object.fromEntries((data ?? []).map((row: any) => [row.id, mapMovementRow(row)]))
  return Object.keys(catalog).length ? catalog : movementCatalog
}

export async function getReplacementRulesForSwap(supabase: any): Promise<MovementReplacementRule[]> {
  const { data, error } = await supabase
    .from('movement_replacement_rules')
    .select('*')
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  const rules = (data ?? []).map(mapMovementReplacementRule)
  return rules.length ? rules : defaultMovementReplacementRules
}

function listAccessoryMovementOptionsFromCatalog(catalog: Record<string, Movement>): AccessoryMovementOption[] {
  return Object.values(catalog)
    .filter((movement) => !movement.isCompetition)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((movement) => ({
      movementId: movement.id,
      movementName: movement.name,
      category: movement.category,
      equipment: movement.equipment,
      defaultUnit: movement.defaultUnit,
    }))
}

export const listAccessoryMovementOptionsFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<AccessoryMovementOption[]> => {
    if (!(await hasSupabaseEnv())) return listAccessoryMovementOptionsFromCatalog(movementCatalog)
    const { supabase } = await requireUser()
    const catalog = await getMovementCatalogForSwap(supabase)
    return listAccessoryMovementOptionsFromCatalog(catalog)
  })
