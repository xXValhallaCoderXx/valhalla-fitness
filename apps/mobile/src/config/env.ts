export type MobileConfig = {
  apiUrl: string
  webUrl: string
  supabaseUrl: string
  supabasePublishableKey: string
}

function required(name: string, value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized) throw new Error(`${name} is required. Copy apps/mobile/.env.example to .env.local.`)
  return normalized.replace(/\/$/, '')
}

export function getMobileConfig(): MobileConfig {
  return {
    apiUrl: required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL),
    webUrl: required('EXPO_PUBLIC_WEB_URL', process.env.EXPO_PUBLIC_WEB_URL),
    supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabasePublishableKey: required(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  }
}
