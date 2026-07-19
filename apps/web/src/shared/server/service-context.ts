import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { Database } from '~/shared/types/database'
import { getSupabaseAnonKey, getSupabaseUrl, type SupabaseServerClient } from './supabase'
import { ServiceError } from './service-error'

export type AuthenticatedServiceContext = {
  supabase: SupabaseServerClient
  user: User
}

export async function resolveServiceContext(
  context?: AuthenticatedServiceContext,
): Promise<AuthenticatedServiceContext> {
  if (context) return context
  const { requireUser } = await import('./require-user')
  return requireUser()
}

export function readBearerToken(request: Request): string {
  const authorization = request.headers.get('authorization')
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i)
  if (!match) {
    throw new ServiceError('UNAUTHENTICATED', 'A valid bearer token is required.', 401)
  }
  return match[1]
}

export async function createBearerServiceContext(request: Request): Promise<AuthenticatedServiceContext> {
  const token = readBearerToken(request)
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) throw new Error('Supabase public configuration is missing.')

  const supabase: SupabaseServerClient = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new ServiceError('UNAUTHENTICATED', 'Your session is invalid or has expired.', 401)
  }
  return { supabase, user: data.user }
}
