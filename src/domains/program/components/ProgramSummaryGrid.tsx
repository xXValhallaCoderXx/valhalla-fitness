import { Badge, Button, Card, Group, Progress } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { Activity, CalendarDays, ListChecks, Target } from 'lucide-react'
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
  const topRegions = overview.bodyLoad.topRegions.slice(0, 3)
  const progressValue = Math.min(100, Math.max(0, position?.progressPercent ?? 0))

  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-2">
      <Card p="md">
        <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
          <div>
            <Group gap="xs">
              <SectionLabel>Current position</SectionLabel>
              <ProgramInfoHint label="What is a wave?">
                Your plan moves in waves — a few weeks building up, then a lighter week to recover before the next push. Your current phase shows where you are in that cycle.
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
          <SummaryMetric icon={<Target size={14} />} label="Progress" value={`${progressValue}%`} />
        </div>

        <Progress value={progressValue} color="action" mt="md" size="sm" radius="xl" />
        {position?.focus ? <Caption mt="sm">{position.focus}</Caption> : null}
      </Card>

      <Card p="md">
        <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
          <div>
            <SectionLabel>Muscle Fatigue</SectionLabel>
            <Heading order={3} size="h4" mt="xs">
              {topRegions.length ? `${topRegions[0].label} worked hardest` : 'All muscles fresh'}
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
