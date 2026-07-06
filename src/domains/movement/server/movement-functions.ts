import { createServerFn } from '@tanstack/react-start'
import type { AccessoryMovementOption, Movement, MovementReplacementRule } from '~/shared/types'
import type { Tables } from '~/shared/types/database'
import type { SupabaseServerClient } from '~/shared/server/supabase'
import { defaultMovementReplacementRules, movementCatalog } from '~/domains/movement/lib/movements'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

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
  }
}

export async function getMovementCatalogForSwap(supabase: SupabaseServerClient): Promise<Record<string, Movement>> {
  const { data, error } = await supabase.from('movements').select('*')
  if (error) throw new Error(error.message)
  const catalog = Object.fromEntries((data ?? []).map((row) => [row.id, mapMovementRow(row)]))
  return Object.keys(catalog).length ? catalog : movementCatalog
}

export async function getReplacementRulesForSwap(supabase: SupabaseServerClient): Promise<MovementReplacementRule[]> {
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

// Full catalog for ad-hoc workouts — competition lifts included and surfaced first.
function listMovementOptionsFromCatalog(catalog: Record<string, Movement>): AccessoryMovementOption[] {
  return Object.values(catalog)
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
    }))
}

export const listMovementOptionsFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<AccessoryMovementOption[]> => {
    if (!(await hasSupabaseEnv())) return listMovementOptionsFromCatalog(movementCatalog)
    const { supabase } = await requireUser()
    const catalog = await getMovementCatalogForSwap(supabase)
    return listMovementOptionsFromCatalog(catalog)
  })
