import { Switch } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Text } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { useExperienceMode } from '~/domains/account/components'
import { meQueryOptions } from '~/domains/account/queries'
import { updateSettingsFn } from '~/domains/account/server/profile-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { accountQueryKeys } from '~/shared/lib/query-keys'

/**
 * The Full-mode "Show formulas" switch, in the Today header.
 *
 * `profiles.show_formulas` already exists and already gates the trace panel; this only puts the
 * control where the comp puts it. Settings keeps the same switch — both write the same field.
 */
export function ShowFormulasToggle() {
  const { isFull, showFormulas } = useExperienceMode()
  const userId = useRequiredAccountId()
  const queryClient = useQueryClient()
  const meQuery = useQuery(meQueryOptions(userId))
  const me = meQuery.data

  const mutation = useMutation({
    // Only the changed key varies; the rest are required by the schema and written back as-is.
    mutationFn: (next: boolean) =>
      updateSettingsFn({
        data: {
          units: me!.units,
          rounding: me!.rounding,
          equipmentProfile: me!.equipmentProfile,
          themePreference: me!.themePreference,
          programStateDefaults: me!.programStateDefaults,
          showFormulas: next,
        },
      }),
    onSuccess: (profile) => queryClient.setQueryData(accountQueryKeys.profile(userId), profile),
    onError: (error) =>
      notifications.show({
        color: 'danger',
        title: 'Could not change formula display',
        message: getApiErrorMessage(error, 'Please try again'),
      }),
  })

  if (!isFull || !me) return null

  return (
    <Switch
      data-testid="show-formulas-toggle"
      checked={showFormulas}
      disabled={mutation.isPending}
      onChange={(event) => mutation.mutate(event.currentTarget.checked)}
      labelPosition="left"
      label={
        <Text component="span" size="sm" fw={700}>
          Show formulas
        </Text>
      }
    />
  )
}
