import type { ReactNode } from 'react'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { Button, Panel, Text } from '@/components'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { SettingsPage } from './SettingsPage'

export function SettingsProfileBoundary({ title, children }: {
  title: string; children: (profile: UserProfile, user: User) => ReactNode
}) {
  const me = useMe()
  const { user } = useSession()
  const onBack = title === 'You' ? undefined : () => router.canGoBack() ? router.back() : router.replace('/you')
  if (me.isPending && !me.data) return <SettingsPage title={title} onBack={onBack}><Text tone="dimmed">Loading your profile…</Text></SettingsPage>
  // A failed background refresh must not unmount an editor with a retained dirty draft.
  if (!me.data || !user || me.data.id !== user.id) return <SettingsPage title={title} onBack={onBack}>
    <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
      <Text weight={800}>Profile unavailable</Text>
      <Text tone="dimmed">{me.error?.message ?? 'Sign in again to edit your profile.'}</Text>
      <Button label="Retry" onPress={() => void me.refetch()} loading={me.isFetching} />
    </Panel>
  </SettingsPage>
  return children(me.data, user)
}
