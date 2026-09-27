import { Switch, View } from 'react-native'
import { Button, Caption, Panel, SectionLabel, SegmentedControl, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function WorkoutPreferences({ autoStartTimer, defaultRestSeconds, disabled,
  onAutoStartTimerChange, onDefaultRestSecondsChange }: {
  autoStartTimer: boolean
  defaultRestSeconds: number
  disabled: boolean
  onAutoStartTimerChange: (enabled: boolean) => void
  onDefaultRestSecondsChange: (seconds: number) => void
}) {
  const { theme } = useTokens()
  const changeRest = (delta: number) => onDefaultRestSecondsChange(Math.min(600, Math.max(30, defaultRestSeconds + delta)))
  const minutes = Math.floor(defaultRestSeconds / 60)
  const seconds = defaultRestSeconds % 60
  const duration = minutes ? `${minutes} min${seconds ? ` ${seconds} sec` : ''}` : `${seconds} sec`
  return <View style={{ gap: spacing.md }}>
    <Caption>Choose how your rest timer starts and how long it runs. Changes apply when you save.</Caption>
    <SectionLabel>Rest timer</SectionLabel>
    <Panel style={{ gap: spacing.lg, padding: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text weight={700}>Start it when I log a set</Text>
          <Caption>Skip or add time during your workout.</Caption>
        </View>
        <Switch value={autoStartTimer} onValueChange={onAutoStartTimerChange} disabled={disabled}
          accessibilityLabel="Start rest timer when I log a set"
          trackColor={{ false: theme.surfaceInset, true: theme.tones.action.border }}
          thumbColor={autoStartTimer ? theme.primaryFill : theme.textMuted} testID="settings-auto-rest" />
      </View>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'space-between' }}>
          <SectionLabel>How long</SectionLabel>
          <View testID="settings-rest-duration"><Text weight={800} tone="action">{duration}</Text></View>
        </View>
        <SegmentedControl value={String(defaultRestSeconds)} onChange={value => onDefaultRestSecondsChange(Number(value))}
          options={[{ value: '60', label: '60s', accessibilityLabel: '60 seconds' },
            { value: '90', label: '90s', accessibilityLabel: '90 seconds' },
            { value: '120', label: '2 min', accessibilityLabel: '2 minutes' },
            { value: '180', label: '3 min', accessibilityLabel: '3 minutes' }]}
          variant="segments" appearance="inset" accessibilityRole="radiogroup"
          accessibilityLabel="Default rest duration" disabled={disabled || !autoStartTimer} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="− 30 sec" variant="default" style={{ flex: 1 }}
            disabled={disabled || !autoStartTimer || defaultRestSeconds <= 30} onPress={() => changeRest(-30)} />
          <Button label="+ 30 sec" variant="default" style={{ flex: 1 }}
            disabled={disabled || !autoStartTimer || defaultRestSeconds >= 600} onPress={() => changeRest(30)} />
        </View>
        <Caption>30 seconds to 10 minutes, in 30-second steps.</Caption>
      </View>
    </Panel>
  </View>
}
