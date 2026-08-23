/**
 * Living styleguide for the native component library (src/components), replacing
 * the spike's inline primitives. Keeps Gate-4 fidelity re-checkable after every
 * visual change — compare side-by-side with the web app.
 */
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Badge,
  Button,
  Caption,
  EmptyState,
  Heading,
  PageHeader,
  Panel,
  Screen,
  SectionLabel,
  StatCard,
  Text,
  TextInput,
} from '@/components'
import { spacing, useTokens, type ToneName } from '@/lib/tokens'

const BADGE_TONES: ToneName[] = ['action', 'accent', 'success', 'warning', 'danger', 'neutral']
const BUTTON_VARIANTS = ['filled', 'light', 'default', 'subtle'] as const

export default function TokensScreen() {
  const { isDark } = useTokens()
  const [notes, setNotes] = useState('')
  const [code, setCode] = useState('12345')

  return (
    <Screen padTop={false}>
      <PageHeader
        eyebrow="Sheetless styleguide"
        title="Components"
        subtitle={`Rendering the ${isDark ? 'dark' : 'light'} theme via useColorScheme().`}
        actions={<Badge tone="action">v1</Badge>}
      />

      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={styles.rowBetween}>
          <SectionLabel>Next session</SectionLabel>
          <Badge tone="action">Week 3 · Day 2</Badge>
        </View>

        <View style={{ gap: 2 }}>
          <Text size="lg" weight="700">
            Competition Bench Press
          </Text>
          <Text tone="dimmed" size="sm">
            4 × 5 @ RPE 7 · top set 100 kg · rest 3 min
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatCard label="Top set" value="100 kg × 5" />
          <StatCard label="e1RM" value="120 kg" tone="action" />
        </View>

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Session notes — how did it feel?"
        />
        <Button label="Start session" fullWidth />
      </Panel>

      <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Buttons</SectionLabel>
        <View style={styles.wrapRow}>
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} label={variant} variant={variant} />
          ))}
        </View>
        <View style={styles.wrapRow}>
          <Button label="Discard" variant="light" tone="danger" />
          <Button label="Saving" loading />
          <Button label="Locked" disabled />
        </View>
      </Panel>

      <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Tone palette</SectionLabel>
        <View style={styles.wrapRow}>
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </View>
        <Caption>Caption text — small, dimmed, sentence case.</Caption>
        <Heading order={3}>Order-3 heading</Heading>
      </Panel>

      <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel>Input states</SectionLabel>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="6-digit code"
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          error={code.length > 0 && code.length < 6 ? 'Enter the full 6-digit code.' : null}
        />
      </Panel>

      <EmptyState
        title="No active program"
        action={<Button label="Browse plans" variant="default" />}
      >
        Choose a training template to generate your daily sessions — or just log a one-off workout.
      </EmptyState>
    </Screen>
  )
}

const styles = StyleSheet.create({
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
})
