export async function requireProgramUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export async function hasProgramSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

export async function getProgramSupabaseClient() {
  const { getSupabaseServerClient } = await import('~/shared/server/supabase')
  return getSupabaseServerClient()
}
