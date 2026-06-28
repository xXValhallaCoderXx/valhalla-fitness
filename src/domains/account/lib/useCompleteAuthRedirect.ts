import { useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { authUserQueryOptions, meQueryOptions } from '~/domains/account/queries'

export function useCompleteAuthRedirect() {
  const router = useRouter()

  return useCallback(async () => {
    const queryClient = router.options.context.queryClient
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auth'] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
    ])
    await queryClient.fetchQuery(authUserQueryOptions())
    await queryClient.fetchQuery(meQueryOptions()).catch(() => null)
    await router.invalidate()
    await router.navigate({ to: '/today' })
  }, [router])
}
