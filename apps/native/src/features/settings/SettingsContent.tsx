import type { ComponentProps } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Badge, Panel, Text } from '@/components'
import { BetaFeedback } from '@/features/feedback/BetaFeedback'
import { spacing } from '@/lib/tokens'
import { AccountSection } from './account/AccountSection'
import { DataSyncSection } from './account/DataSyncSection'
import { TrainingSettings } from './TrainingSettings'
import type { SettingsEntrySection } from './settings-section'
import { useSettingsSectionScroll } from './useSettingsSectionScroll'

export function SettingsContent({ section, training, account, settingsSaved, onExportPendingChange }: {
  section?: SettingsEntrySection
  training: Omit<ComponentProps<typeof TrainingSettings>, 'onStartingNumbersLayout'>
  account: ComponentProps<typeof AccountSection>
  settingsSaved: boolean
  onExportPendingChange: (pending: boolean) => void
}) {
  const insets = useSafeAreaInsets()
  const { scrollRef, onLayout, onContentSizeChange, onStartingNumbersLayout } = useSettingsSectionScroll(section)

  return (
    <ScrollView
      ref={scrollRef}
      onLayout={onLayout}
      onContentSizeChange={onContentSizeChange}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.md + insets.bottom }}
    >
      <Panel surface="inset" style={{ gap: spacing.xs, padding: spacing.sm }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
          <Text size="sm" weight={800} style={{ flex: 1 }}>Profile & training defaults</Text>
          <Badge tone="action">Online only</Badge>
        </View>
        <Text size="xs" tone="dimmed">
          Tune appearance, training defaults, equipment, body profile, data, and account controls.
        </Text>
        {settingsSaved ? <Text size="sm" tone="success">Settings saved.</Text> : null}
      </Panel>

      <TrainingSettings {...training} onStartingNumbersLayout={onStartingNumbersLayout} />
      <DataSyncSection
        user={training.user}
        disabled={training.draft.dirty || training.controlsDisabled}
        onPendingChange={onExportPendingChange}
      />
      <BetaFeedback user={training.user} />
      <AccountSection {...account} />
    </ScrollView>
  )
}
