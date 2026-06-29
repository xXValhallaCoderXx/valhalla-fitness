import { Badge, Button, Card, Group } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { Play, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, StatValue, Text } from '~/components'
import type { MovementRole, ProgramOverview } from '~/shared/types'
import type { ProgramTimelineModel } from '~/domains/program/lib/program-timeline'
import { formatFullDate } from '~/shared/lib/dates'

/**
 * "Next up" — one short, wide band: session identity + main lift on the left,
 * accessories as tight rows in the middle, and the Open-session CTA with
 * composition pills on the right. Answers "what's next?" without scrolling.
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
        <Heading order={2} size="h3" mt="xs">
          No session queued
        </Heading>
        <Text mt={4} size="sm" tone="dimmed">
          Finish or complete your current session to queue the next one.
        </Text>
      </Panel>
    )
  }

  const inProgress = nextSession.status === 'in_progress'
  const main = nextSession.movements.find((movement) => movement.role === 'main')
  const accessories = nextSession.movements.filter((movement) => movement.role !== 'main')
  const dateLine = [
    position ? `Week ${position.weekNumber}` : null,
    position?.phaseLabel ?? timeline.weeks[timeline.currentWeekIndex]?.phaseLabel,
    formatFullDate(nextSession.scheduledDate),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card p="md" className="mb-4 vf-card-hover" style={{ borderColor: 'var(--vf-action-border)' }}>
      <div className="grid gap-5 lg:grid-cols-[18.75rem_1fr_auto] lg:items-center">
        <div className="min-w-0">
          <Group gap="xs">
            <Badge color="action" variant="filled">
              Next session
            </Badge>
            <Group gap={5} wrap="nowrap">
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: inProgress ? 'var(--vf-warning-text)' : 'var(--vf-success-text)',
                }}
              />
              <Text size="xs" fw={700} tone={inProgress ? 'warning' : 'success'}>
                {inProgress ? 'In progress' : 'Ready'}
              </Text>
            </Group>
          </Group>
          <Heading order={2} size="h3" mt="xs" lh={1.15}>
            {nextSession.title}
          </Heading>
          <Caption mt={4}>{dateLine}</Caption>

          {main ? (
            <Panel
              surface="inset"
              p="sm"
              mt="sm"
              style={{ borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)' }}
            >
              <Group justify="space-between" gap="sm" wrap="nowrap" align="flex-end">
                <div className="min-w-0">
                  <SectionLabel tone="action">Main lift</SectionLabel>
                  <Heading order={3} size="h4" mt={2} lh={1.1} className="truncate">
                    {main.movementName}
                  </Heading>
                </div>
                <Text size="sm" fw={700} tone="action" style={{ whiteSpace: 'nowrap' }}>
                  {main.targetSummary}
                </Text>
              </Group>
            </Panel>
          ) : null}
        </div>

        <div className="min-w-0">
          <SectionLabel className="mb-2">Then accessories</SectionLabel>
          {accessories.length ? (
            <div className="space-y-2">
              {accessories.map((movement, index) => {
                const tag = accessoryTag(movement.role)
                return (
                  <Panel key={`${movement.movementName}-${index}`} surface="inset" p="xs">
                    <Group gap="sm" wrap="nowrap">
                      <Badge color={tag.color} variant="light" size="xs" style={{ flexShrink: 0 }}>
                        {tag.label}
                      </Badge>
                      <Text size="sm" fw={700} truncate className="min-w-0 flex-1">
                        {movement.movementName}
                      </Text>
                      <Caption style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{movement.targetSummary}</Caption>
                    </Group>
                  </Panel>
                )
              })}
            </div>
          ) : (
            <Caption>No accessories queued for this session.</Caption>
          )}
        </div>

        <div className="flex flex-col gap-2.5 lg:w-48">
          <Link to={nextSession.href} className="w-full">
            <Button fullWidth>
              {inProgress ? <RotateCw size={16} /> : <Play size={16} />}
              {inProgress ? 'Resume session' : 'Open session'}
            </Button>
          </Link>
          <div className="hidden grid-cols-3 gap-1.5 lg:grid">
            <CompositionPill value={nextSession.mainCount} label="Main" />
            <CompositionPill value={nextSession.variationCount} label="Var." />
            <CompositionPill value={nextSession.accessoryCount} label="Acc." />
          </div>
        </div>
      </div>
    </Card>
  )
}

function CompositionPill({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        backgroundColor: 'var(--vf-surface-2)',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        padding: '7px 0',
      }}
    >
      <StatValue size="sm" ta="center">
        {value}
      </StatValue>
      <SectionLabel ta="center" mt={1}>
        {label}
      </SectionLabel>
    </div>
  )
}

function accessoryTag(role: MovementRole): { label: string; color: string } {
  if (role === 'variation') return { label: 'Variation', color: 'action' }
  if (role === 'accessory') return { label: 'Accessory', color: 'warning' }
  if (role === 'warmup') return { label: 'Warm-up', color: 'neutral' }
  return { label: role.charAt(0).toUpperCase() + role.slice(1), color: 'neutral' }
}
