import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { useAdvancedInvitation } from './useAdvancedInvitation'

export function AdvancedInvitation({ user }: { user: User }) {
  const invitation = useAdvancedInvitation(user)
  const { theme } = useTokens()
  if (!invitation.visible) return null
  return <Panel style={{ gap: spacing.sm, padding: spacing.md, borderColor: theme.tones.action.border }}>
    <SectionLabel tone="action">Your detail level</SectionLabel>
    <Text weight={800}>Want to see more training detail?</Text>
    <Caption>Advanced shows full targets and training detail. You can choose it in You whenever you like. Your workouts and progress stay the same.</Caption>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Button label="Open You" disabled={invitation.pending}
        loading={invitation.pending && invitation.action === 'open'} onPress={() => void invitation.respond('open')} />
      <Button label="Not now" variant="default" disabled={invitation.pending}
        loading={invitation.pending && invitation.action === 'dismiss'} onPress={() => void invitation.respond('dismiss')} />
    </View>
    {invitation.error ? <View style={{ gap: spacing.xs }} accessibilityLiveRegion="polite">
      <Text tone="danger" size="sm">{invitation.error}</Text>
      <Button label="Retry" variant="subtle" disabled={invitation.pending} onPress={() => void invitation.retry()} />
    </View> : null}
  </Panel>
}
