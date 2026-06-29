import { Badge, Card, Group } from '@mantine/core'
import { Caption, SectionLabel, Text } from '~/components'
import type { ProgramOverview } from '~/shared/types'

export function RecentProgramSessions({ overview }: { overview: ProgramOverview }) {
  return (
    <Card p="md">
      <Group justify="space-between" gap="md" wrap="nowrap">
        <SectionLabel>Recent sessions</SectionLabel>
        <Badge>{overview.recentSessions.length}</Badge>
      </Group>
      {overview.recentSessions.length ? (
        <div className="mt-2">
          {overview.recentSessions.map((session, index) => {
            const sub = [session.weekLabel, session.topSetHighlights[0]].filter(Boolean).join(' · ')
            return (
              <Group
                key={session.id}
                justify="space-between"
                gap="md"
                wrap="nowrap"
                className="py-2.5"
                style={index === 0 ? undefined : { borderTop: '1px solid var(--mantine-color-default-border)' }}
              >
                <div className="min-w-0">
                  <Text size="sm" fw={700} truncate>
                    {session.title}
                  </Text>
                  <Caption mt={1} truncate>
                    {sub || 'Completed session'}
                  </Caption>
                </div>
                <Badge color="success" style={{ flexShrink: 0 }}>
                  {session.completedSetCount}/{session.plannedSetCount}
                </Badge>
              </Group>
            )
          })}
        </div>
      ) : (
        <Caption mt="sm">No completed sessions for this program yet.</Caption>
      )}
    </Card>
  )
}
