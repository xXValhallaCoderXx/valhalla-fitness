import { View } from 'react-native'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { AuthLegal } from './AuthLegal'

export function AuthWelcome({ onCreate, onSignIn }: { onCreate: () => void; onSignIn: () => void }) {
  return <>
    <View style={{ flexGrow: 1, justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.xl }}>
      <Heading order={1} style={{ fontSize: 32 }}>Stop doing the maths.{ '\n' }Just lift.</Heading>
      <Panel style={{ padding: spacing.lg, gap: spacing.sm }}>
        <SectionLabel>Example workout · Bench press</SectionLabel>
        <Heading order={2} style={{ fontSize: 30 }}>95 kg × 5</Heading>
        <Text size="sm" tone="dimmed">Your planned weight and reps, ready when you are.</Text>
        <Panel surface="inset" style={{ padding: spacing.sm }}>
          <Text weight={800} tone="action" align="center">Log the set. Review what comes next.</Text>
        </Panel>
        <Caption>Example only. Your numbers come from your plan and training.</Caption>
      </Panel>
      <View style={{ gap: spacing.md }}>
        <Text>✓  Every planned weight worked out for you</Text>
        <Text>✓  Review changes, then choose Apply or Keep</Text>
        <Text>✓  See your progress from the sets you log</Text>
      </View>
    </View>
    <Button label="Get started" fullWidth size="lg" onPress={onCreate} testID="auth-get-started" />
    <View style={{ alignItems: 'center' }}><Text size="sm" tone="dimmed">Already have an account?</Text>
      <Button label="Sign in" variant="subtle" style={{ alignSelf: 'center' }} onPress={onSignIn} testID="auth-welcome-sign-in" />
    </View>
    <AuthLegal />
  </>
}
