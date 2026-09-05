import { QueryClient } from '@tanstack/react-query'

/** Mirrors the web QueryClient defaults (apps/web/src/router.tsx). */
export function createQueryClient() {
  return new QueryClient({
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
}
