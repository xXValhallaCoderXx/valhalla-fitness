import { View } from 'react-native'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { calendarDateInTimeZone } from '@sheetless/domain/shared/calendar-date'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { convertWeight } from '@sheetless/domain/shared/math'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Button, Caption, ConfirmDialog, Panel, Text, TextInput } from '@/components'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { SettingsPage } from './SettingsPage'
import { useSettingsLeaveGuard } from './useSettingsLeaveGuard'
import { BodyweightHistory } from './profile/BodyweightHistory'
import { useBodyweightSettings } from './profile/useBodyweightSettings'

export function BodyweightScreen() {
  const profile = useMe()
  const { user } = useSession()
  if (!user || !profile.data || profile.data.id !== user.id) return <SettingsPage title="Bodyweight"
    onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/you')}>
    <Text>{profile.isError ? 'Your profile could not load.' : 'Loading your profile…'}</Text>
    {profile.isError ? <Button label="Retry profile" onPress={() => void profile.refetch()} /> : null}
  </SettingsPage>
  return <LoadedBodyweightScreen key={user.id} user={user} profile={profile.data} />
}

function LoadedBodyweightScreen({ user, profile }: { user: User; profile: UserProfile }) {
  const state = useBodyweightSettings(user, profile)
  const leave = useSettingsLeaveGuard({ dirty: state.dirty, pending: Boolean(state.pending), onDiscard: state.discard })
  const today = calendarDateInTimeZone(new Date(), profile.timezone)
  const todayEntry = state.entries.data?.find(entry => entry.recordedOn === today)
  const numericWeight = Number(state.weight.replace(',', '.'))
  const candidate = state.deleteCandidate
  return <>
    <SettingsPage title="Bodyweight" onBack={leave.goBack}>
      <Caption>Optional. Bodyweight helps supported strength comparisons; you can train without it.</Caption>
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text weight={800}>{todayEntry ? 'Update today’s measurement' : 'Log today’s measurement'}</Text>
        <Caption>{formatCompactDate(today)} · Saves when you tap {todayEntry ? 'Replace today' : 'Log today'}.</Caption>
        <TextInput value={state.weight} onChangeText={state.setWeight} keyboardType="decimal-pad"
          accessibilityLabel={`Today's bodyweight in ${state.inputUnits}`} placeholder={`Weight (${state.inputUnits})`}
          editable={!state.pending} testID="settings-bodyweight-input" />
        {state.logError ? <View accessibilityLiveRegion="polite"><Text tone="danger">{state.logError}</Text></View> : null}
        {state.saved ? <Text tone="success">Bodyweight saved.</Text> : null}
        <Button label={todayEntry ? 'Replace today' : 'Log today'} loading={state.pending === 'log'}
          disabled={Boolean(state.pending) || !state.dirty || !Number.isFinite(numericWeight) || numericWeight <= 0}
          onPress={() => void state.log()} testID="settings-bodyweight-log" />
        <Caption>One measurement per day. Saving again replaces that day’s value.</Caption>
      </Panel>
      {state.entries.isPending ? <Text tone="dimmed">Loading measurements…</Text> : null}
      {state.entries.isError ? <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text tone="warning">Bodyweight history could not load. Your saved measurements have not been removed.</Text>
        <Button label="Retry bodyweight history" variant="default" loading={state.entries.isFetching}
          disabled={Boolean(state.pending)} onPress={() => void state.entries.refetch()} />
      </Panel> : null}
      {state.entries.isSuccess && state.entries.data.length === 0 ? <Text tone="dimmed">No bodyweight logged yet. Add a measurement whenever you want.</Text> : null}
      {state.entries.data?.length ? <BodyweightHistory entries={state.entries.data} units={profile.units} today={today}
        disabled={Boolean(state.pending)} onDelete={state.requestDelete} /> : null}
    </SettingsPage>
    <ConfirmDialog open={Boolean(candidate)} title="Delete bodyweight entry?" confirmLabel="Delete entry" tone="danger"
      isPending={state.pending === 'delete'} error={state.deleteError} onCancel={state.cancelDelete} onConfirm={() => void state.remove()}>
      {candidate ? `Remove ${formatWeight(convertWeight(candidate.weightKg, 'kg', profile.units), profile.units)} from ${formatCompactDate(candidate.recordedOn)}?` : ''}
    </ConfirmDialog>
    {leave.dialog}
  </>
}
