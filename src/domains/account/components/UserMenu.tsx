import { useMutation, useQuery } from '@tanstack/react-query'
import { Avatar, Menu, SegmentedControl, UnstyledButton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link, useRouter } from '@tanstack/react-router'
import { LogOut, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { initialsFrom } from '~/domains/account/lib/initials'
import { meQueryOptions } from '~/domains/account/queries'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { updateSettingsFn } from '~/domains/account/server/profile-functions'
import { useSignOut } from '~/domains/account/useSignOut'
import type { Unit } from '~/shared/types'
import { Caption, Text } from '~/components/atoms'

/** Top-right avatar with the account dropdown: profile row, kg/lb toggle, Settings, log out. */
export function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter()
  const [opened, setOpened] = useState(false)
  const me = useQuery(meQueryOptions()).data ?? null
  const signOutMutation = useSignOut()
  const unitsMutation = useMutation({
    mutationFn: (units: Unit) => {
      if (!me) throw new Error('Profile not loaded yet')
      // updateSettingsFn expects the full preferences payload; only units changes here.
      return updateSettingsFn({
        data: {
          units,
          rounding: me.rounding,
          equipmentProfile: me.equipmentProfile,
          themePreference: me.themePreference,
          programStateDefaults: me.programStateDefaults,
        },
      })
    },
    onSuccess: (next) => {
      const queryClient = router.options.context.queryClient
      queryClient.setQueryData(meQueryOptions().queryKey, next)
      // Server-rendered strings (target summaries, previous labels, dashboard stats) embed units.
      void queryClient.invalidateQueries({ queryKey: ['today'] })
      void queryClient.invalidateQueries({ queryKey: ['history'] })
      void queryClient.invalidateQueries({ queryKey: ['programOverview'] })
      void queryClient.invalidateQueries({ queryKey: ['activeProgram'] })
      void queryClient.invalidateQueries({ queryKey: ['session'] })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not update units',
        message: getApiErrorMessage(error, 'Unable to update units'),
      })
    },
  })

  const displayName = me?.displayName?.trim() || null
  const email = me?.email ?? user.email ?? ''
  const initials = initialsFrom(displayName, email)

  return (
    <Menu opened={opened} onChange={setOpened} position="bottom-end" width={260} withinPortal>
      <Menu.Target>
        <UnstyledButton
          aria-label="Account menu"
          style={{ borderRadius: '50%', boxShadow: opened ? '0 0 0 2px var(--vf-action-border)' : undefined }}
        >
          <Avatar size={32} radius="xl" color="action" variant="light">
            {initials}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar size={32} radius="xl" color="action" variant="light">
            {initials}
          </Avatar>
          <div className="min-w-0">
            <Text size="sm" fw={800} truncate>
              {displayName ?? email}
            </Text>
            {displayName && email ? <Caption truncate>{email}</Caption> : null}
          </div>
        </div>
        <Menu.Divider />
        {me ? (
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <Text size="sm" fw={700}>
              Units
            </Text>
            <SegmentedControl
              size="xs"
              disabled={unitsMutation.isPending}
              value={(unitsMutation.isPending ? unitsMutation.variables : null) ?? me.units}
              onChange={(value) => unitsMutation.mutate(value as Unit)}
              data={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </div>
        ) : null}
        <Menu.Item
          component={Link}
          to="/settings"
          leftSection={<SettingsIcon size={14} color="var(--mantine-color-dimmed)" />}
        >
          Settings
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="danger"
          leftSection={<LogOut size={14} />}
          disabled={signOutMutation.isPending}
          onClick={() => signOutMutation.mutate()}
        >
          {signOutMutation.isPending ? 'Signing out...' : 'Log out'}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
