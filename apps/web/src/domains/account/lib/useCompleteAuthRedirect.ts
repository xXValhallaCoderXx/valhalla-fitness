import { useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { authUserQueryOptions, meQueryOptions } from '~/domains/account/queries'
import { transitionAccountCache } from '~/shared/lib/account-cache'
import { authQueryKeys } from '~/shared/lib/query-keys'

export function useCompleteAuthRedirect() {
  const router = useRouter()

  return useCallback(async () => {
    const queryClient = router.options.context.queryClient
    await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
    const user = await queryClient.fetchQuery(authUserQueryOptions())
    await transitionAccountCache(queryClient, user?.id ?? null)
    if (user) await queryClient.fetchQuery(meQueryOptions(user.id)).catch(() => null)
    await router.invalidate()
    await router.navigate({ to: '/today' })
  }, [router])
}
