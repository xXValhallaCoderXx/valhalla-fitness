import { useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { countSelectedEquipmentProfileOptions } from '@sheetless/domain/account/equipment-profile'
import { hasLoadDefault, oneRepMaxKeys } from '@sheetless/domain/account/settings-form'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { calendarDateInTimeZone } from '@sheetless/domain/shared/calendar-date'
import { convertWeight } from '@sheetless/domain/shared/math'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { SettingsPage } from './SettingsPage'
import { SettingsProfileBoundary } from './SettingsProfileBoundary'
import { SettingsSaveFooter } from './SettingsSaveFooter'
import { YouRow } from './YouRow'
import { YouPreferences } from './preferences/YouPreferences'
import { SexSheet } from './profile/SexSheet'
import { experienceSignalsQueryOptions, settingsBodyweightQueryOptions } from './queries'
import { useSettingsEditor } from './useSettingsEditor'
import { useSettingsLeaveGuard } from './useSettingsLeaveGuard'

export function YouScreen() {
  return <SettingsProfileBoundary title="You">{(profile, user) =>
    <LoadedYou key={user.id} profile={profile} user={user} />
  }</SettingsProfileBoundary>
}

function LoadedYou({ profile, user }: { profile: UserProfile; user: User }) {
  const editor = useSettingsEditor(profile, user, 'you')
  const leave = useSettingsLeaveGuard({ dirty: editor.dirty, pending: editor.saving, onDiscard: editor.discard })
  const [sexOpen, setSexOpen] = useState(false)
  const [detailY, setDetailY] = useState<number>()
  const { focus } = useLocalSearchParams<{ focus?: string }>()
  const weights = useQuery(settingsBodyweightQueryOptions(user))
  const signals = useQuery(experienceSignalsQueryOptions(user))
  const today = calendarDateInTimeZone(new Date(), profile.timezone)
  const latest = weights.data?.filter(entry => entry.recordedOn <= today).at(-1)
  const count = signals.data?.completedSessions
  const weightLabel = weights.isError ? 'Could not load — open to retry' : latest
    ? `${formatWeight(convertWeight(latest.weightKg, 'kg', profile.units), profile.units)} · ${formatCompactDate(latest.recordedOn)}`
    : weights.isPending ? 'Loading…' : 'Not recorded'
  const estimateCount = oneRepMaxKeys.filter(key => hasLoadDefault(profile.programStateDefaults[key])).length
  return <>
    <SettingsPage title="You" scrollToY={focus === 'detail-level' ? detailY : undefined}
      footer={<SettingsSaveFooter visible={editor.dirty} isSaving={editor.saving} hasValidationErrors={false}
        error={editor.error} onSave={() => void editor.save()} onDiscard={editor.discard} />}>
      <Panel style={{ padding: spacing.md, gap: spacing.xs }}>
        <Text size="xl" weight={900}>{profile.displayName?.trim() || 'Your Sheetless'}</Text>
        {count !== undefined ? <Caption>{count} completed {count === 1 ? 'workout' : 'workouts'}</Caption> : null}
        {signals.isError ? <Button label="Retry workout count" variant="subtle" onPress={() => void signals.refetch()} /> : null}
        <Caption>Your profile, training defaults and app preferences.</Caption>
      </Panel>
      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Your body</SectionLabel>
        <YouRow title="Bodyweight" value={weightLabel} disabled={editor.saving} onPress={() => leave.navigate('/you/bodyweight')} />
        <YouRow title="Sex" subtitle="Used for supported strength calculations" value={profile.sex === 'male' ? 'Male' : profile.sex === 'female' ? 'Female' : 'Prefer not to say'}
          disabled={editor.saving} onPress={() => leave.request(() => setSexOpen(true))} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Your training</SectionLabel>
        <YouRow title="Equipment you own" subtitle="Your available equipment" disabled={editor.saving}
          value={profile.equipmentProfile.length ? `${countSelectedEquipmentProfileOptions(profile.equipmentProfile)} selected` : 'All equipment'}
          onPress={() => leave.navigate('/you/equipment')} />
        <YouRow title="Starting numbers" subtitle="Where a new plan starts" value={`${estimateCount} of ${oneRepMaxKeys.length} lifts set`}
          disabled={editor.saving} onPress={() => leave.navigate('/you/starting-numbers')} />
      </View>
      <View style={{ gap: spacing.sm }} onLayout={event => setDetailY(event.nativeEvent.layout.y)}>
        <SectionLabel>The app</SectionLabel>
        <YouPreferences editor={editor} />
        <YouRow title="Workout settings" subtitle="Automatic rest and timer duration"
          value={profile.autoStartTimer ? `Rest ${profile.defaultRestSeconds} sec` : 'Automatic rest off'} disabled={editor.saving}
          onPress={() => leave.navigate('/you/workouts')} />
        <YouRow title="Data and account" subtitle="Export, feedback, privacy and sign out" disabled={editor.saving}
          onPress={() => leave.navigate('/you/account')} />
      </View>
      {editor.saved ? <Text tone="success" size="sm">Changes saved.</Text> : null}
    </SettingsPage>
    {sexOpen ? <SexSheet profile={profile} user={user} onClose={() => setSexOpen(false)} /> : null}
    {leave.dialog}
  </>
}
