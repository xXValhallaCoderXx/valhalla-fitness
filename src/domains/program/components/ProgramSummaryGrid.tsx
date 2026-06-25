import { Badge, Button, Card, Group, Progress } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { Activity, ArrowRight, CalendarDays, Dumbbell, ListChecks, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, StatCard, Text } from '~/components'
import type { BodyLoadRegion, ProgramOverview } from '~/shared/types'
import type { ProgramTimelineModel } from '~/domains/program/lib/program-timeline'
import { ProgramInfoHint } from './ProgramInfoHint'

export function ProgramSummaryGrid({
  overview,
  timeline,
}: {
  overview: ProgramOverview
  timeline: ProgramTimelineModel
}) {
  const position = overview.position
  const nextSession = overview.nextSession
  const topRegions = overview.bodyLoad.topRegions.slice(0, 3)
  const progressValue = Math.min(100, Math.max(0, position?.progressPercent ?? 0))

  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_1fr_0.9fr]">
      <Card p="md">
        <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
          <div>
            <Group gap="xs">
              <SectionLabel>Current position</SectionLabel>
              <ProgramInfoHint label="Current position">
                This is derived from the active template definition and the program's current session index.
              </ProgramInfoHint>
            </Group>
            <Heading order={3} size="h4" mt="xs">
              {position?.phaseLabel ?? 'Current phase'}
            </Heading>
            <Caption mt={4}>{position?.weekLabel ?? timeline.weeks[timeline.currentWeekIndex]?.subtitle}</Caption>
          </div>
          <Badge color={hardnessColor(position?.hardness)}>{position?.hardness ?? 'Current'}</Badge>
        </Group>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <SummaryMetric icon={<CalendarDays size={14} />} label="Week" value={`${position?.weekNumber ?? timeline.currentWeekIndex + 1}/${timeline.totalWeeks}`} />
          <SummaryMetric icon={<ListChecks size={14} />} label="Session" value={`${position?.sessionNumber ?? timeline.currentSessionInWeek + 1}/${timeline.daysPerWeek}`} />
          <SummaryMetric icon={<Target size={14} />} label="Progress" value={`${position?.progressPercent ?? 0}%`} />
        </div>

        <Progress value={progressValue} color="action" mt="md" size="sm" radius="xl" />
        {position?.focus ? <Caption mt="sm">{position.focus}</Caption> : null}
      </Card>

      <Card p="md">
        <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
          <div className="min-w-0">
            <SectionLabel>Next session</SectionLabel>
            <Text size="lg" fw={800} mt="xs" truncate>
              {nextSession?.title ?? 'No session queued'}
            </Text>
            <Caption mt={4}>{nextSession?.movementSummary ?? 'Start a program to queue work.'}</Caption>
          </div>
          <Badge color={nextSession?.status === 'in_progress' ? 'warning' : nextSession?.status === 'completed' ? 'success' : 'action'}>
            {nextSession?.status.replaceAll('_', ' ') ?? 'planned'}
          </Badge>
        </Group>

        <Card
          component="details"
          p="sm"
          mt="sm"
          radius="md"
          style={{ backgroundColor: 'var(--vf-surface-2)' }}
        >
          <summary className="cursor-pointer list-none">
            <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
              <div>
                <Caption fw={800}>Key work</Caption>
                <Text mt={4} size="sm" fw={700}>
                  {nextSession?.keyPrescription ?? 'No prescription'}
                </Text>
              </div>
              <SectionLabel component="span" className="shrink-0">
                {nextSession?.movements.length ? `${nextSession.movements.length} movements` : 'Details'}
              </SectionLabel>
            </Group>
          </summary>
          {nextSession?.movements.length ? (
            <div className="mt-3 space-y-1.5 border-t pt-3">
              {nextSession.movements.map((movement, index) => (
                <Panel key={`${movement.role}-${movement.movementName}-${index}`} surface="panel" px="xs" py={6}>
                  <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
                    <div className="min-w-0">
                      <Text size="xs" fw={700} truncate>
                        {movement.movementName}
                      </Text>
                      <Caption size="0.625rem" truncate>
                        {movement.targetSummary}
                      </Caption>
                    </div>
                    <SectionLabel component="span" className="shrink-0">
                      {movement.role}
                    </SectionLabel>
                  </Group>
                </Panel>
              ))}
            </div>
          ) : null}
        </Card>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <SummaryMetric icon={<Dumbbell size={14} />} label="Main" value={nextSession?.mainCount ?? 0} />
          <SummaryMetric icon={<Dumbbell size={14} />} label="Variations" value={nextSession?.variationCount ?? 0} />
          <SummaryMetric icon={<ListChecks size={14} />} label="Accessories" value={nextSession?.accessoryCount ?? 0} />
        </div>

        {nextSession ? (
          <Link to={nextSession.href}>
            <Button className="mt-3 w-full" variant="light">
              <ArrowRight size={14} />
              Open session
            </Button>
          </Link>
        ) : null}
      </Card>

      <Card p="md">
        <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
          <div>
            <SectionLabel>Body load</SectionLabel>
            <Heading order={3} size="h4" mt="xs">
              {overview.bodyLoad.freshRegionCount} fresh regions
            </Heading>
          </div>
          <Activity size={18} color="var(--vf-action-text)" />
        </Group>
        <div className="mt-3 space-y-2">
          {topRegions.length ? topRegions.map((region) => (
            <BodyLoadMiniRow key={region.regionId} region={region} />
          )) : (
            <Panel surface="inset" p="sm">
              <Caption>No recent completed sets.</Caption>
            </Panel>
          )}
        </div>
        <Link to="/history">
          <Button className="mt-3 w-full" variant="default">
            <Activity size={14} />
            Insights
          </Button>
        </Link>
      </Card>
    </div>
  )
}

function SummaryMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return <StatCard icon={icon} label={label} value={value} />
}

function BodyLoadMiniRow({ region }: { region: BodyLoadRegion }) {
  return (
    <Panel surface="inset" p="xs">
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Text size="xs" fw={800} truncate>
          {region.label}
        </Text>
        <Text size="xs" fw={900}>
          {region.impactPercent}%
        </Text>
      </Group>
      <Progress value={region.impactPercent} color={bodyLoadColor(region.tier)} mt={6} size="xs" radius="xl" />
    </Panel>
  )
}

function bodyLoadColor(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'danger'
  if (tier === 'moderate') return 'warning'
  if (tier === 'low') return 'action'
  return 'neutral'
}

export function hardnessColor(hardness?: string | null) {
  if (hardness === 'Hard') return 'danger'
  if (hardness === 'Medium') return 'warning'
  if (hardness === 'Light') return 'success'
  return 'neutral'
}
