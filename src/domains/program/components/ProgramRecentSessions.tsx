import { Badge, Card, Group } from '@mantine/core'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { ProgramOverview } from '~/shared/types'

export function RecentProgramSessions({ overview }: { overview: ProgramOverview }) {
  return (
    <Card p="md">
      <Group justify="space-between" gap="md" wrap="nowrap">
        <SectionLabel>Recent program sessions</SectionLabel>
        <Badge>{overview.recentSessions.length}</Badge>
      </Group>
      {overview.recentSessions.length ? (
        <div className="mt-3 space-y-2">
          {overview.recentSessions.map((session) => (
            <Panel key={session.id} surface="inset" p="sm">
              <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
                <div className="min-w-0">
                  <Text size="sm" fw={800} truncate>
                    {session.title}
                  </Text>
                  <Caption mt={2}>{session.weekLabel ?? 'Completed session'}</Caption>
                </div>
                <Badge color="success">{session.completedSetCount}/{session.plannedSetCount}</Badge>
              </Group>
              {session.topSetHighlights.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {session.topSetHighlights.map((highlight) => (
                    <Badge key={highlight} color="accent" variant="light">
                      {highlight}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Caption mt="sm">No top-set highlight.</Caption>
              )}
            </Panel>
          ))}
        </div>
      ) : (
        <Caption mt="sm">No completed sessions for this program yet.</Caption>
      )}
    </Card>
  )
}
