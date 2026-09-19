import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { experienceModeDescriptions } from '@sheetless/domain/account/experience-mode'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, Caption, Panel, SectionLabel, SegmentedControl, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { SettingsSection } from '../SettingsSection'
import { useExperienceSettings } from './useExperienceSettings'

export function ExperienceSection({ user, profile, disabled }: {
  user: User
  profile: UserProfile
  disabled: boolean
}) {
  const save = useExperienceSettings(user, profile)
  const busy = disabled || save.isPending
  const mode = profile.experienceMode

  return (
    <SettingsSection title="Experience" description="How the app reads. Your training and calculations stay the same.">
      <Panel style={{ gap: spacing.lg, padding: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <SectionLabel>Reading mode</SectionLabel>
          <SegmentedControl
            variant="segments"
            accessibilityRole="radiogroup"
            accessibilityLabel="Reading mode"
            options={[{ value: 'guided', label: 'Guided' }, { value: 'full', label: 'Full' }]}
            value={mode}
            onChange={save.setMode}
            disabled={busy}
          />
          <Caption>{experienceModeDescriptions[mode]}</Caption>
        </View>
        {mode === 'full' ? (
          <View style={{ gap: spacing.sm }}>
            <SectionLabel>Show formulas</SectionLabel>
            <SegmentedControl
              variant="segments"
              accessibilityRole="radiogroup"
              accessibilityLabel="Show formulas"
              options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]}
              value={profile.showFormulas ? 'on' : 'off'}
              onChange={(value) => save.setFormulas(value === 'on')}
              disabled={busy}
            />
            <Caption>Show the arithmetic behind planned loads.</Caption>
          </View>
        ) : null}
        <Caption>Reading preferences save immediately.</Caption>
        {save.isPending ? <Text size="sm" tone="dimmed">Saving reading preferences…</Text> : null}
        {save.isError ? (
          <View style={{ gap: spacing.sm }}>
            <Text size="sm" tone="danger">{getApiErrorMessage(save.error, 'Could not save your reading preference.')}</Text>
            <Button label="Retry" variant="default" onPress={save.retry} disabled={busy} />
          </View>
        ) : null}
        {save.isSuccess ? <Text size="sm" tone="success">Reading preferences saved.</Text> : null}
      </Panel>
      <View style={{ gap: spacing.sm }}>
        <Text size="sm" weight={700}>Full mode invitation</Text>
        <Caption>After eight completed sessions, Today can offer a one-time introduction to Full. Both modes are always available here.</Caption>
        <Button
          label="Show hints again"
          variant="default"
          onPress={save.restoreHints}
          disabled={busy || !profile.fullModeHintDismissedAt}
        />
      </View>
    </SettingsSection>
  )
}
