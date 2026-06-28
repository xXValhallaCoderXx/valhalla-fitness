import { Badge, Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Dumbbell, Layers3, ListChecks, Play, RotateCw } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, StatCard, Text } from '~/components'
import type { ProgramOverview } from '~/shared/types'
import type { ProgramTimelineModel } from '~/domains/program/lib/program-timeline'
import { formatFullDate } from '~/shared/lib/dates'

/**
 * Dominant "what's next" hero for the Program page — leads the page so it
 * answers "where am I, and what's next?" at a glance. Mirrors the Today
 * "Ready" card but frames the session as the next step in the plan.
 */
export function NextWorkoutHero({
  overview,
  timeline,
}: {
  overview: ProgramOverview
  timeline: ProgramTimelineModel
}) {
  const nextSession = overview.nextSession
  const position = overview.position

  if (!nextSession) {
    return (
      <Panel className="mb-4" p="md">
        <SectionLabel>Next up in your plan</SectionLabel>
        <Heading order={2} size="h3" mt="xs">No session queued</Heading>
        <Text mt={4} size="sm" tone="dimmed">
          Finish or complete your current session to queue the next one.
        </Text>
      </Panel>
    )
  }

  const inProgress = nextSession.status === 'in_progress'
  const main = nextSession.movements.find((movement) => movement.role === 'main')
  const accessories = nextSession.movements.filter((movement) => movement.role !== 'main')
  const weekLine = position
    ? `Week ${position.weekNumber} of ${position.totalWeeks} · ${position.phaseLabel}`
    : timeline.description

  return (
    <Panel className="mb-4 vf-card-hover" p="md" style={{ borderColor: 'var(--vf-action-border)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge color="action" variant="filled">Next up in your plan</Badge>
            <Badge color={inProgress ? 'warning' : 'action'}>{inProgress ? 'In progress' : 'Ready'}</Badge>
          </div>
          <Heading order={2} size="h3" lh={1.15}>{nextSession.title}</Heading>
          <Text mt={4} size="sm" tone="dimmed" lineClamp={2}>
            {nextSession.movementSummary} · {formatFullDate(nextSession.scheduledDate)}
          </Text>
          <Caption mt="xs" fw={700}>{weekLine}</Caption>
        </div>
        <Link to={nextSession.href} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            {inProgress ? <RotateCw size={16} /> : <Play size={16} />}
            {inProgress ? 'Resume session' : 'Open session'}
          </Button>
        </Link>
      </div>

      {main ? (
        <Panel surface="inset" p="sm" className="mt-4" style={{ borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Badge color="action" leftSection={<Dumbbell size={12} />}>Main lift</Badge>
              <Heading mt="xs" order={3} size="h4" lh={1.15} className="truncate">{main.movementName}</Heading>
              <Text size="sm" tone="dimmed">{main.targetSummary}</Text>
            </div>
            <ArrowRight color="var(--mantine-color-dimmed)" size={18} />
          </div>
        </Panel>
      ) : null}

      {accessories.length ? (
        <div className="mt-3">
          <SectionLabel className="mb-1.5">Accessories</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {accessories.map((movement, index) => (
              <Panel key={`${movement.movementName}-${index}`} surface="inset" p="sm" className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Text fw={700} truncate>{movement.movementName}</Text>
                  <Caption>{movement.targetSummary}</Caption>
                </div>
                <Badge>{movement.role}</Badge>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatCard icon={<Dumbbell size={14} />} label="Main" value={nextSession.mainCount} />
        <StatCard icon={<Layers3 size={14} />} label="Variations" value={nextSession.variationCount} />
        <StatCard icon={<ListChecks size={14} />} label="Accessories" value={nextSession.accessoryCount} />
      </div>
    </Panel>
  )
}
