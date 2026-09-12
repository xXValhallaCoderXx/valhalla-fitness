import type { QueryClient } from '@tanstack/react-query'
import { authUserQueryOptions, meQueryOptions } from '~/domains/account/queries'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { transitionAccountCache } from '~/shared/lib/account-cache'
import type { UserProfile } from '~/domains/account'
import appCss from '~/styles/app.css?url'

export type RootRouterContext = {
  queryClient: QueryClient
}

export type LoadedRootRouteContext = RootRouterContext & {
  user: AuthUser | null
  me: UserProfile | null
}

export async function loadRootRoute({ context }: { context: RootRouterContext }) {
  const authOptions = authUserQueryOptions()

  if (typeof window !== 'undefined') {
    const cachedUser = context.queryClient.getQueryData<AuthUser | null>(authOptions.queryKey)
    if (cachedUser !== undefined) {
      await transitionAccountCache(context.queryClient, cachedUser?.id ?? null)
      void context.queryClient.prefetchQuery(authOptions)
      const profileOptions = cachedUser ? meQueryOptions(cachedUser.id) : null
      if (profileOptions) void context.queryClient.prefetchQuery(profileOptions)
      return {
        user: cachedUser,
        me: cachedUser
          ? context.queryClient.getQueryData<UserProfile | null>(profileOptions!.queryKey) ?? null
          : null,
      }
    }
  }

  const user = await context.queryClient.fetchQuery(authOptions)
  await transitionAccountCache(context.queryClient, user?.id ?? null)
  const me = user
    ? await context.queryClient.fetchQuery(meQueryOptions(user.id)).catch(() => null)
    : null
  return { user, me }
}

export function appRootHead() {
  return {
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#197f9a' },
      { name: 'application-name', content: 'Sheetless' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Sheetless' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { title: 'Sheetless' },
      {
        name: 'description',
        content: 'Structured strength training tracker for planned progression.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.json', type: 'application/manifest+json' },
      { rel: 'icon', href: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/pwa/apple-touch-icon.png' },
    ],
  }
}
