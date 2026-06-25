import type { QueryClient } from '@tanstack/react-query'

export async function loadRouteQuery(queryClient: QueryClient, options: unknown) {
  if (typeof window === 'undefined') {
    await queryClient.ensureQueryData(options as Parameters<QueryClient['ensureQueryData']>[0])
    return
  }

  void queryClient.prefetchQuery(options as Parameters<QueryClient['prefetchQuery']>[0])
}

export async function loadRouteQueries(queryClient: QueryClient, options: unknown[]) {
  if (typeof window === 'undefined') {
    await Promise.all(
      options.map((queryOptions) =>
        queryClient.ensureQueryData(queryOptions as Parameters<QueryClient['ensureQueryData']>[0]),
      ),
    )
    return
  }

  options.forEach((queryOptions) => {
    void queryClient.prefetchQuery(queryOptions as Parameters<QueryClient['prefetchQuery']>[0])
  })
}
