import { createServerFn } from '@tanstack/react-start'
import type { AccessoryMovementOption } from '~/domains/movement'
import { movementCatalog } from '~/domains/movement/lib/movements'
import {
  getMovementCatalogForSwap,
  listAccessoryMovementOptionsFromCatalog,
  listMovementOptionsFromCatalog,
} from '@sheetless/data/movement/catalog'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

export const listAccessoryMovementOptionsFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<AccessoryMovementOption[]> => {
    if (!(await hasSupabaseEnv())) return listAccessoryMovementOptionsFromCatalog(movementCatalog)
    const { supabase } = await requireUser()
    const catalog = await getMovementCatalogForSwap(supabase)
    return listAccessoryMovementOptionsFromCatalog(catalog)
  })

export const listMovementOptionsFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<AccessoryMovementOption[]> => {
    if (!(await hasSupabaseEnv())) return listMovementOptionsFromCatalog(movementCatalog)
    const { supabase } = await requireUser()
    const catalog = await getMovementCatalogForSwap(supabase)
    return listMovementOptionsFromCatalog(catalog)
  })
