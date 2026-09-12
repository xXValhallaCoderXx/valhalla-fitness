import { Badge, Card, Group } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Caption, EquipmentModeBadge, SectionLabel, Text } from '~/components'
import type { ProgramOverview } from '~/domains/program'
import { useAccountClock } from '~/domains/account/components/AccountIdentityProvider'
import { describeWorkoutDate } from '~/shared/lib/dates'

export function RecentProgramSessions({ overview }: { overview: ProgramOverview }) {
  const clock = useAccountClock()
  return (
    <Card p="md">
      <SectionLabel>Recent sessions</SectionLabel>
      {overview.recentSessions.length ? (
        <div className="mt-2">
          {overview.recentSessions.slice(0, 3).map((session, index) => {
            const complete = session.plannedSetCount > 0 && session.completedSetCount >= session.plannedSetCount
            const date = describeWorkoutDate({
              scheduledDate: session.scheduledDate,
              completedAt: session.completedAt,
              timeZone: session.timeZone ?? clock.timeZone,
              today: clock.today,
            })
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
                  <div className="flex items-center gap-2">
                    <Text size="sm" fw={700} truncate>
                      {session.title}
                    </Text>
                    <EquipmentModeBadge equipmentMode={session.equipmentMode} className="shrink-0" />
                  </div>
                  <Caption mt={1} truncate>
                    {date.compactDate} · {date.relativeDate}
                  </Caption>
                  {date.completionLabel ? <Caption mt={1} truncate>{date.completionLabel}</Caption> : null}
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
        <Caption mt="sm">No completed sessions for this programme yet.</Caption>
      )}
    </Card>
  )
}
