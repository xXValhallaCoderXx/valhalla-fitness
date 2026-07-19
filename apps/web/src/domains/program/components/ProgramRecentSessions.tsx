import { Badge, Card, Group } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Caption, SectionLabel, Text } from '~/components'
import type { ProgramOverview } from '~/shared/types'
import { formatCompactDate, formatRelativeTime } from '~/shared/lib/dates'

export function RecentProgramSessions({ overview }: { overview: ProgramOverview }) {
  return (
    <Card p="md">
      <SectionLabel>Recent sessions</SectionLabel>
      {overview.recentSessions.length ? (
        <div className="mt-2">
          {overview.recentSessions.slice(0, 3).map((session, index) => {
            const complete = session.plannedSetCount > 0 && session.completedSetCount >= session.plannedSetCount
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
                    {sessionWhen(session.completedAt, session.scheduledDate)}
                  </Caption>
                </div>
                <Badge color={complete ? 'success' : 'warning'} variant="light" style={{ flexShrink: 0 }}>
                  {session.completedSetCount}/{session.plannedSetCount}
                </Badge>
              </Group>
            )
          })}
          <div className="flex justify-center pt-2" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Link to="/history">
              <Group gap={6} wrap="nowrap">
                <Text size="sm" fw={700} tone="action">
                  All sessions
                </Text>
                <ArrowRight size={15} color="var(--vf-action-text)" />
              </Group>
            </Link>
          </div>
        </div>
      ) : (
        <Caption mt="sm">No completed sessions for this program yet.</Caption>
      )}
    </Card>
  )
}

/** "Yesterday" for fresh sessions, a compact date once it's older. */
function sessionWhen(completedAt?: string | null, scheduledDate?: string) {
  const stamp = completedAt ?? scheduledDate
  if (!stamp) return 'Completed session'
  const ageDays = (Date.now() - Date.parse(stamp)) / 86_400_000
  if (Number.isFinite(ageDays) && ageDays < 2) {
    const relative = formatRelativeTime(stamp)
    return relative.charAt(0).toUpperCase() + relative.slice(1)
  }
  return formatCompactDate(stamp)
}
