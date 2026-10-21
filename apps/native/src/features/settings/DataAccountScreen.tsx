import { View } from 'react-native'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { BetaFeedback } from '@/features/feedback/BetaFeedback'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { SettingsPage } from './SettingsPage'
import { useSettingsLeaveGuard } from './useSettingsLeaveGuard'
import { DeleteAccountSheet } from './account/DeleteAccountSheet'
import { useDataAccount } from './account/useDataAccount'

export function DataAccountScreen() {
  const profile = useMe()
  const { user } = useSession()
  if (!user || !profile.data || profile.data.id !== user.id) return <SettingsPage title="Data and account"
    onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/you')}>
    <Text>{profile.isError ? 'Your profile could not load.' : 'Loading your profile…'}</Text>
    {profile.isError ? <Button label="Retry profile" onPress={() => void profile.refetch()} /> : null}
  </SettingsPage>
  return <LoadedDataAccountScreen key={user.id} user={user} profile={profile.data} />
}

function LoadedDataAccountScreen({ user, profile }: { user: User; profile: UserProfile }) {
  const actions = useDataAccount(user)
  const leave = useSettingsLeaveGuard({ dirty: false, pending: Boolean(actions.pending), onDiscard: () => {} })
  const disabled = Boolean(actions.pending)
  return <>
    <SettingsPage title="Data and account" onBack={leave.goBack}>
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel>Signed in as</SectionLabel>
        <Text weight={800}>{profile.displayName?.trim() || 'Sheetless member'}</Text>
        <Text selectable>{profile.email ?? 'No email address'}</Text>
        <Caption>Your sign-in identity is read-only here.</Caption>
      </Panel>
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel>Workout saving</SectionLabel>
        <Text weight={800}>Online only</Text>
        <Caption>Workouts need an internet connection to save. Keep the app open and retry any failed or pending edits; closing the app can lose them.</Caption>
      </Panel>
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel>Your data</SectionLabel>
        <Caption>Create a JSON copy of your profile, programmes, workouts, sets, bodyweight, decisions and feedback, then choose where to share it.</Caption>
        <Button label="Create and share JSON" loading={actions.pending === 'export'} disabled={disabled}
          onPress={() => void actions.exportData()} testID="settings-export-data" />
        {actions.exportPrepared ? <Text tone="success">Your export was prepared. Sharing depends on the destination you chose.</Text> : null}
        {disabled ? <Button label="Beta feedback" variant="default" disabled /> : <BetaFeedback user={user} />}
      </Panel>
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel>Legal and privacy</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button label="Privacy" variant="subtle" disabled={disabled} onPress={() => void actions.openLegal('/privacy')} />
          <Button label="Terms" variant="subtle" disabled={disabled} onPress={() => void actions.openLegal('/terms')} />
          <Button label="Deletion information" variant="subtle" disabled={disabled} onPress={() => void actions.openLegal('/account-deletion')} />
        </View>
      </Panel>
      {actions.error && actions.error.action !== 'delete' ? <View accessibilityLiveRegion="polite"><Text tone="danger">{actions.error.message}</Text></View> : null}
      <Button label="Sign out" variant="default" loading={actions.pending === 'signOut'} disabled={disabled}
        onPress={() => void actions.signOut()} testID="settings-sign-out" />
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <SectionLabel tone="danger">Delete account</SectionLabel>
        <Caption>Permanently remove your login and Sheetless data. You will confirm before anything is deleted.</Caption>
        <Button label="Delete account" tone="danger" variant="light" disabled={disabled} onPress={actions.openDelete} testID="settings-delete-account" />
      </Panel>
    </SettingsPage>
    {actions.deleteOpen ? <DeleteAccountSheet pending={actions.pending === 'delete'}
      error={actions.error?.action === 'delete' ? actions.error.message : null}
      onClose={actions.closeDelete} onConfirm={value => void actions.deleteAccount(value)} /> : null}
    {leave.dialog}
  </>
}
