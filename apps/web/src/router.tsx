import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'
import { AppError } from './components/AppError'
import { NotFound } from './components/NotFound'
import { PageSkeleton } from './components'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  })

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPendingComponent: () => <PageSkeleton compact />,
    defaultPendingMinMs: 150,
    defaultErrorComponent: AppError,
    defaultNotFoundComponent: NotFound,
    // The authed app uses an internal scroll container (see AppShell), so document-level scroll
    // restoration doesn't apply; the scroll area resets to the top per route via its `key`.
    scrollRestoration: false,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
