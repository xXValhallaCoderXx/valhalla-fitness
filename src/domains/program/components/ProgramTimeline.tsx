import { Badge, Box, Card, Group, SimpleGrid } from '@mantine/core'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type { ProgramTimelineModel } from '~/domains/program/lib/program-timeline'

export function ProgramTimeline({
  currentSessionIndex,
  status,
  timeline,
}: {
  currentSessionIndex: number
  status: string
  timeline: ProgramTimelineModel
}) {
  const [expandedWeeks, setExpandedWeeks] = useState(() => new Set([timeline.currentWeekIndex]))

  const toggleWeek = (weekIndex: number) => {
    setExpandedWeeks((current) => {
      const next = new Set(current)
      if (next.has(weekIndex)) {
        next.delete(weekIndex)
      } else {
        next.add(weekIndex)
      }
      return next
    })
  }

  return (
    <Card p="md">
      <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
        <div>
          <SectionLabel>Timeline</SectionLabel>
          <Caption mt={4}>{timeline.description}</Caption>
        </div>
        <Badge color="action">{status}</Badge>
      </Group>
      <Box className="relative mt-4 overflow-y-auto pr-2" style={{ maxHeight: 'min(72vh, 44rem)' }}>
        <Box
          aria-hidden
          className="absolute bottom-4 left-4 top-4"
          style={{
            width: 1,
            backgroundColor: 'var(--mantine-color-default-border)',
          }}
        />
        <div className="relative space-y-3">
          {timeline.weeks.map((week) => {
            const current = week.index === timeline.currentWeekIndex
            const complete = week.index < timeline.currentWeekIndex
            const expanded = expandedWeeks.has(week.index)
            return (
              <div key={week.index} className="relative z-10 flex gap-3">
                <TimelineMarker current={current} complete={complete} />
                <Card
                  p="sm"
                  className="flex-1"
                  style={{
                    backgroundColor: current
                      ? 'var(--vf-action-soft)'
                      : complete
                        ? 'var(--mantine-color-default)'
                        : 'transparent',
                    borderColor: current ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
                    borderStyle: current || complete ? 'solid' : 'dashed',
                    opacity: complete ? 0.7 : 1,
                  }}
                >
                  <button type="button" className="w-full text-left" onClick={() => toggleWeek(week.index)}>
                    <Group justify="space-between" gap="md" wrap="nowrap">
                      <div>
                        <Text fw={800}>Week {week.index + 1}</Text>
                        <Caption>{week.subtitle}</Caption>
                      </div>
                      <Group className="shrink-0" gap="xs" wrap="nowrap">
                        {complete ? <Badge color="success">Done</Badge> : current ? <Badge color="action">Current</Badge> : <Badge>Locked</Badge>}
                        <Caption fw={700}>{expanded ? 'Hide' : 'Details'}</Caption>
                      </Group>
                    </Group>
                    <Caption mt="sm">{week.summary}</Caption>
                  </button>

                  {expanded ? (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      {week.sessions.map((session) => (
                        <Card
                          component="details"
                          key={session.label}
                          p="xs"
                          radius="md"
                          style={{
                            backgroundColor: 'var(--vf-surface-2)',
                            borderColor:
                              session.globalIndex === currentSessionIndex
                                ? 'var(--vf-action-border)'
                                : session.globalIndex < currentSessionIndex
                                  ? 'var(--vf-success-border)'
                                  : 'var(--mantine-color-default-border)',
                            opacity: session.globalIndex < currentSessionIndex ? 0.75 : 1,
                          }}
                        >
                          <summary className="cursor-pointer list-none">
                            <Group align="flex-start" justify="space-between" gap="sm">
                              <Text size="xs" fw={800}>
                                {session.label}: {session.title}
                              </Text>
                              <Caption fw={600}>{session.movementSummary}</Caption>
                            </Group>
                          </summary>
                          <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="xs" mt="xs" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                            {session.movements.map((movement, index) => (
                              <TimelineSessionDetail
                                key={`${movement.roleLabel}-${movement.movementName}-${index}`}
                                label={movement.roleLabel}
                                movementName={movement.movementName}
                                targetSummary={movement.targetSummary}
                              />
                            ))}
                          </SimpleGrid>
                          <Caption mt="sm">{session.progressionNote}</Caption>
                        </Card>
                      ))}
                    </div>
                  ) : null}
                </Card>
              </div>
            )
          })}
        </div>
      </Box>
    </Card>
  )
}

function TimelineMarker({ current, complete }: { current: boolean; complete: boolean }) {
  const backgroundColor = complete
    ? 'var(--mantine-color-success-filled)'
    : current
      ? 'var(--mantine-primary-color-filled)'
      : 'var(--vf-surface-2)'

  return (
    <Box
      className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4"
      style={{
        backgroundColor,
        borderColor: 'var(--mantine-color-body)',
        color: complete || current ? 'white' : 'var(--mantine-color-dimmed)',
      }}
    >
      {complete ? <Check size={12} /> : current ? (
        <Box className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'white' }} />
      ) : (
        <Box className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--mantine-color-default-border)' }} />
      )}
    </Box>
  )
}

function TimelineSessionDetail({
  label,
  movementName,
  targetSummary,
}: {
  label: string
  movementName: string
  targetSummary: string
}) {
  return (
    <Panel surface="panel" p="xs">
      <SectionLabel>{label}</SectionLabel>
      <Text mt={4} fw={600}>
        {movementName}
      </Text>
      <Caption mt={2}>{targetSummary}</Caption>
    </Panel>
  )
}
