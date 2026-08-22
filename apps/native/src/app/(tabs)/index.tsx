import { Link } from 'expo-router'
import { Caption, EmptyState, PageHeader, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { useTokens } from '@/lib/tokens'

export default function TodayScreen() {
  const { user } = useSession()
  const { theme } = useTokens()

  return (
    <Screen>
      <PageHeader title="Today" subtitle={`Signed in as ${user?.email ?? 'unknown'}.`} />
      <EmptyState title="Your planned session lands here">
        The next milestone wires this tab to your live program via the shared data layer.
      </EmptyState>
      <Link href="/(dev)/tokens" style={{ color: theme.tones.action.text }}>
        <Text tone="action" size="sm" weight="600">
          Dev · component styleguide
        </Text>
      </Link>
      <Caption>Build channel: development</Caption>
    </Screen>
  )
}
