import { getSupabaseServerClient } from './supabase'
import type { AuthenticatedServiceContext } from './service-context'

export async function requireUser(): Promise<AuthenticatedServiceContext> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Not authenticated')
  }
  return { supabase, user: data.user }
}
