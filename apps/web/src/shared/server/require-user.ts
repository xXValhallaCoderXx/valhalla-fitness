import { getSupabaseServerClient } from './supabase'

export async function requireUser() {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('Not authenticated')
  }
  return { supabase, user: data.user }
}
