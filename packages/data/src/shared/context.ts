import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@sheetless/domain/shared/types'

/**
 * The client every data function is parameterized over. Each app shell builds
 * its own: web from the cookie-based server client, native from the
 * SecureStore-backed supabase-js client. Auth acquisition (cookies vs stored
 * session) never lives in this package.
 */
export type DataClient = SupabaseClient<Database>

/** An authenticated caller: the client plus the user it is scoped to. */
export type UserContext = {
  supabase: DataClient
  user: User
}
