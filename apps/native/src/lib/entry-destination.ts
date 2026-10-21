export type EntrySearchParams = Record<string, string | string[] | undefined>

export const DEFAULT_ENTRY_DESTINATION = '/(tabs)'

const fixedPaths: Record<string, string> = {
  '/': DEFAULT_ENTRY_DESTINATION,
  '/(tabs)': DEFAULT_ENTRY_DESTINATION,
  '/history': '/(tabs)/history',
  '/you': '/(tabs)/you',
  '/you/bodyweight': '/(tabs)/you/bodyweight',
  '/(tabs)/you/bodyweight': '/(tabs)/you/bodyweight',
  '/you/equipment': '/(tabs)/you/equipment',
  '/(tabs)/you/equipment': '/(tabs)/you/equipment',
  '/you/starting-numbers': '/(tabs)/you/starting-numbers',
  '/(tabs)/you/starting-numbers': '/(tabs)/you/starting-numbers',
  '/you/workouts': '/(tabs)/you/workouts',
  '/(tabs)/you/workouts': '/(tabs)/you/workouts',
  '/you/account': '/(tabs)/you/account',
  '/(tabs)/you/account': '/(tabs)/you/account',

  '/program': '/(tabs)/program',
  '/program/weeks': '/(tabs)/program/weeks',
  '/program/equipment': '/(tabs)/program/equipment',
  '/(tabs)/history': '/(tabs)/history',
  '/(tabs)/you': '/(tabs)/you',
  '/(tabs)/program': '/(tabs)/program',
  '/(tabs)/program/weeks': '/(tabs)/program/weeks',
  '/(tabs)/program/equipment': '/(tabs)/program/equipment',
  '/templates': '/templates',
  '/templates/find': '/templates/find',
  '/settings': '/settings',
}
const templatePath = /^\/template\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}(?:\/setup)?$/
const sessionPath = /^\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\/summary)?$/i

function canonicalPath(pathname: string) {
  if (Object.hasOwn(fixedPaths, pathname)) return fixedPaths[pathname]
  return templatePath.test(pathname) || sessionPath.test(pathname) ? pathname : null
}

function appendAllowedParams(pathname: string, value: (key: string) => string | undefined) {
  const params = new URLSearchParams()
  if (pathname === '/(tabs)/you' && value('focus') === 'detail-level') params.set('focus', 'detail-level')
  if (pathname === '/settings' && value('section') === 'starting-numbers') {
    params.set('section', 'starting-numbers')
  }
  if (templatePath.test(pathname) && value('source') === 'finder') {
    params.set('source', 'finder')
    const days = value('finderDays')
    if (days && /^[2-5]$/.test(days)) params.set('finderDays', days)
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

/** Only route identity and public finder choices survive entry; account drafts never do. */
export function safeEntryDestination(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2_048 || /[\s\\#]/.test(value)) return DEFAULT_ENTRY_DESTINATION
  const [path, query = ''] = value.split('?')
  const pathname = canonicalPath(path)
  if (!pathname) return DEFAULT_ENTRY_DESTINATION
  const params = new URLSearchParams(query)
  return appendAllowedParams(pathname, key => params.getAll(key).length === 1 ? params.get(key) ?? undefined : undefined)
}

export function getEntryDestination(pathname: string, params: EntrySearchParams): string {
  if (pathname === '/auth' || pathname === '/first-run') return safeEntryDestination(params.next)
  const path = canonicalPath(pathname)
  if (!path) return DEFAULT_ENTRY_DESTINATION
  return appendAllowedParams(path, key => typeof params[key] === 'string' ? params[key] : undefined)
}
