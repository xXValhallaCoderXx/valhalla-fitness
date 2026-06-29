import { Badge, Button, Card, Group, Progress } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
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
  const progressValue = Math.min(100, Math.max(0, Math.round(position?.progressPercent ?? 0)))
  const phaseTitle = [position?.phaseLabel ?? 'Current phase', position?.waveLabel].filter(Boolean).join(' · ')

  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-2">
      <Card p="md" className="flex flex-col">
        <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
          <Group gap="xs">
            <SectionLabel>Current position</SectionLabel>
            <ProgramInfoHint label="What is a wave?">
              Your plan moves in waves — a few weeks building up, then a lighter week to recover before the next push. Your current phase shows where you are in that cycle.
            </ProgramInfoHint>
          </Group>
          <Badge color={hardnessColor(position?.hardness)}>{hardnessLabel(position?.hardness)}</Badge>
        </Group>
        <Heading order={3} size="h4" mt="xs">
          {phaseTitle}
        </Heading>
        <Caption mt={4}>{position?.focus ?? position?.weekSummary ?? timeline.weeks[timeline.currentWeekIndex]?.summary}</Caption>

        <Group gap="md" wrap="nowrap" className="mt-auto pt-4">
          <Progress value={progressValue} color="action" size="sm" radius="xl" className="flex-1" />
          <Text size="xs" fw={700} tone="action" style={{ whiteSpace: 'nowrap' }}>
            {progressValue}% of cycle
          </Text>
        </Group>
      </Card>

      <Card p="md">
        <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
          <div>
            <SectionLabel>Muscle fatigue</SectionLabel>
            <Heading order={3} size="h4" mt="xs">
              {topRegions.length ? `${topRegions[0].label} worked hardest` : 'All muscles fresh'}
            </Heading>
          </div>
          <Activity size={18} color="var(--vf-action-text)" />
        </Group>
        <div className="mt-3 space-y-2">
          {topRegions.length ? (
            topRegions.map((region) => <BodyLoadMiniRow key={region.regionId} region={region} />)
          ) : (
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

function BodyLoadMiniRow({ region }: { region: BodyLoadRegion }) {
  return (
    <div>
      <Group justify="space-between" gap="sm" wrap="nowrap" mb={5}>
        <Text size="sm" fw={600} truncate>
          {region.label}
        </Text>
        <Text size="sm" fw={700} tone="dimmed">
          {region.impactPercent}%
        </Text>
      </Group>
      <Progress value={region.impactPercent} color={bodyLoadColor(region.tier)} size="xs" radius="xl" />
    </div>
  )
}

function bodyLoadColor(tier: BodyLoadRegion['tier']) {
  if (tier === 'high') return 'danger'
  if (tier === 'moderate') return 'warning'
  if (tier === 'low') return 'action'
  return 'neutral'
}

function hardnessLabel(hardness?: string | null) {
  if (hardness === 'Light') return 'Light week'
  if (hardness === 'Deload') return 'Deload week'
  return hardness ?? 'Current'
}

export function hardnessColor(hardness?: string | null) {
  if (hardness === 'Hard') return 'danger'
  if (hardness === 'Medium') return 'warning'
  if (hardness === 'Light') return 'success'
  return 'neutral'
}
