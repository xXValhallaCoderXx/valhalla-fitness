import { createSheetlessApiClient } from '@sheetless/api'
import { getMobileConfig } from '@/config/env'
import { supabase } from '@/auth/supabase'

export const api = createSheetlessApiClient({
  baseUrl: getMobileConfig().apiUrl,
  getAccessToken: async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  },
  refreshAccessToken: async () => {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) throw error
    return data.session?.access_token ?? null
  },
  clearSession: async () => {
    await supabase.auth.signOut({ scope: 'local' })
  },
})
