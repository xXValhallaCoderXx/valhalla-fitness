import { useState } from 'react'
import { Button, EmptyState, Panel, Screen, SectionLabel, Text } from '@/components'
import { useMe } from '@/lib/account'
import { getSupabase } from '@/lib/supabase'
import { spacing } from '@/lib/tokens'

export function SettingsScreen() {
  const me = useMe()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const signOut = async () => {
    setSigningOut(true)
    setSignOutError(null)
    const { error } = await getSupabase().auth.signOut()
    if (error) setSignOutError(error.message)
    setSigningOut(false)
  }

  if (me.isPending) {
    return (
      <Screen padTop={false}>
        <Panel style={{ padding: spacing.md }}>
          <Text tone="dimmed">Loading settings…</Text>
        </Panel>
      </Screen>
    )
  }

  if (me.isError || !me.data) {
    return (
      <Screen padTop={false}>
        <EmptyState title="Profile unavailable">
          {me.error instanceof Error ? me.error.message : 'Sign in again to edit settings.'}
        </EmptyState>
      </Screen>
    )
  }

  return (
    <Screen padTop={false}>
      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Account</SectionLabel>
        <Text weight={800}>{me.data.displayName?.trim() || 'Sheetless member'}</Text>
        <Text size="sm" tone="dimmed" selectable>{me.data.email ?? 'No email address'}</Text>
        {signOutError ? <Text size="sm" tone="danger">{signOutError}</Text> : null}
        <Button label="Sign out" variant="default" loading={signingOut} onPress={signOut} />
      </Panel>
    </Screen>
  )
}
