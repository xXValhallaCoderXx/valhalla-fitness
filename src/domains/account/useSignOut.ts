import { useMutation } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { authUserQueryOptions, meQueryOptions } from '~/domains/account/queries'
import { signOutFn } from '~/domains/account/server/auth-functions'

/** Sign out, tear down every account-scoped query cache, and land on /auth. */
export function useSignOut() {
  const router = useRouter()
  return useMutation({
    mutationFn: async () => {
      const result = await signOutFn()
      if (!result.ok) throw new Error(result.message)
      return result
    },
    onSuccess: async () => {
      const queryClient = router.options.context.queryClient
      queryClient.setQueryData(authUserQueryOptions().queryKey, null)
      queryClient.setQueryData(meQueryOptions().queryKey, null)
      queryClient.removeQueries({ queryKey: ['activeProgram'] })
      queryClient.removeQueries({ queryKey: ['today'] })
      queryClient.removeQueries({ queryKey: ['programOverview'] })
      queryClient.removeQueries({ queryKey: ['history'] })
      queryClient.removeQueries({ queryKey: ['session'] })
      await router.invalidate()
      await router.navigate({ to: '/auth' })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not sign out',
        message: getApiErrorMessage(error, 'Unable to sign out'),
      })
    },
  })
}
