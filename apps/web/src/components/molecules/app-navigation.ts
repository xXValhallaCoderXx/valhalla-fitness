export type BottomNavSection = '/today' | '/program' | '/history' | '/templates'

export type AppHeaderBackTarget = Readonly<{
  label: 'Back to Programmes' | 'Back to Today'
  to: '/templates' | '/today'
}>

export type AppNavigation = Readonly<{
  backTarget: AppHeaderBackTarget | null
  activeBottomNavSection: BottomNavSection | null
}>

const programsBackTarget = {
  label: 'Back to Programmes',
  to: '/templates',
} as const satisfies AppHeaderBackTarget

const todayBackTarget = {
  label: 'Back to Today',
  to: '/today',
} as const satisfies AppHeaderBackTarget

const topLevelSections = new Map<string, BottomNavSection>([
  ['/today', '/today'],
  ['/program', '/program'],
  ['/history', '/history'],
  ['/templates', '/templates'],
])

/**
 * Resolves shell navigation from a route-like path. Query strings and hashes are
 * accepted so callers do not have to pre-normalize a full location value.
 */
export function resolveAppNavigation(route: string): AppNavigation {
  const pathname = route.trim().split(/[?#]/, 1)[0] || '/'
  const topLevelPath = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname

  if (/^\/templates\/[^/]+\/start\/?$/.test(pathname)) {
    return {
      backTarget: programsBackTarget,
      activeBottomNavSection: '/templates',
    }
  }

  if (/^\/sessions\/[^/]+(?:\/summary)?\/?$/.test(pathname)) {
    return {
      backTarget: todayBackTarget,
      activeBottomNavSection: '/today',
    }
  }

  return {
    backTarget: null,
    activeBottomNavSection: topLevelSections.get(topLevelPath) ?? null,
  }
}
