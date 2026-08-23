import { View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import type { ProgramSetupOptions } from '@sheetless/domain/program/types'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function FindMyPlanPreview({
  open,
  loading,
  error,
  sessions,
  onToggle,
  onRetry,
}: {
  open: boolean
  loading: boolean
  error: string | null
  sessions: ProgramSetupOptions['previewWeeks'][number]['sessions']
  onToggle: () => void
  onRetry: () => void
}) {
  const { theme } = useTokens()
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <SectionLabel>A typical week</SectionLabel>
        <Button
          label={open ? 'Hide week' : 'See what’s inside'}
          variant="subtle"
          leftSection={(
            <ChevronDown
              color={theme.tones.action.text}
              size={17}
              style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
            />
          )}
          style={{ minHeight: 44, paddingHorizontal: spacing.xs }}
          onPress={onToggle}
        />
      </View>
      {open ? (
        loading ? (
          <Caption>Loading the week…</Caption>
        ) : error ? (
          <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.sm }}>
            <Caption tone="warning">{error}</Caption>
            <Button
              label="Try preview again"
              variant="default"
              style={{ minHeight: 44 }}
              onPress={onRetry}
            />
          </Panel>
        ) : sessions.length ? (
          <View style={{ gap: spacing.sm }}>
            {sessions.map((session) => (
              <Panel key={session.id} surface="inset" style={{ gap: 3, padding: spacing.sm }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
                  <Caption tone="action">{session.label}</Caption>
                  <Text size="sm" weight={800} style={{ flex: 1 }}>{session.title}</Text>
                </View>
                <Caption>{session.movementSummary}</Caption>
              </Panel>
            ))}
          </View>
        ) : (
          <Caption>Plan preview is unavailable right now.</Caption>
        )
      ) : null}
    </View>
  )
}
