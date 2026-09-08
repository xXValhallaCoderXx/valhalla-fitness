export type AppStoreLinks = {
  android: string | null
  ios: string | null
  /** False when neither store is configured yet — the prompt then says "coming soon". */
  available: boolean
}

const STORE_HOSTS: Record<'android' | 'ios', readonly string[]> = {
  android: ['play.google.com'],
  ios: ['apps.apple.com', 'itunes.apple.com'],
}

/**
 * Only accept an https link to that platform's real store. The value arrives from deployment
 * env, so a typo or a stale placeholder would otherwise become a link we point people at.
 */
function storeUrl(raw: string | null | undefined, platform: 'android' | 'ios'): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null
  return STORE_HOSTS[platform].includes(parsed.hostname) ? parsed.toString() : null
}

export function resolveAppStoreLinks(input: {
  androidUrl?: string | null
  iosUrl?: string | null
}): AppStoreLinks {
  const android = storeUrl(input.androidUrl, 'android')
  const ios = storeUrl(input.iosUrl, 'ios')
  return { android, ios, available: Boolean(android || ios) }
}
