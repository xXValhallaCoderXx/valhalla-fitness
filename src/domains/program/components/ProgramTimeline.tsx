import { Badge, Card, Group } from '@mantine/core'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import type {
  ProgramTrajectory,
  TrajectoryLiftTarget,
  TrajectoryPhase,
  TrajectoryValuePill,
  TrajectoryWeek,
} from '~/domains/program/lib/program-trajectory'
import { ProgramInfoHint } from './ProgramInfoHint'

/**
 * Full timeline — the plan grouped into phases. Completed phases show the
 * training maxes they banked; the current and upcoming phases show weekly
 * top-set targets and where they land if every progression hits.
 */
export function ProgramTimeline({ trajectory }: { trajectory: ProgramTrajectory }) {
  const currentKey = trajectory.phases.find((phase) => phase.status === 'current')?.key
  const [expandedPhases, setExpandedPhases] = useState(() => new Set(currentKey ? [currentKey] : []))

  const togglePhase = (key: string) => {
    setExpandedPhases((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <Card p="md">
      <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
        <Group gap="xs">
          <SectionLabel>Full timeline</SectionLabel>
          <ProgramInfoHint label="Are later weights fixed?">
            Upcoming numbers assume you hit each week&apos;s targets — Sheetless re-checks after every session and
            adjusts the plan from how your training actually went.
          </ProgramInfoHint>
        </Group>
        <Badge style={{ flexShrink: 0 }}>{trajectory.totalWeeks} weeks</Badge>
      </Group>
      {trajectory.hasTargets ? (
        <Text mt={4} size="sm" tone="dimmed">
          Weekly top-set targets for the main lifts, computed from your training maxes. Hit them and this is your
          trajectory.
        </Text>
      ) : null}
      <div className="mt-3 space-y-3">
        {trajectory.phases.map((phase) => (
          <PhaseCard
            key={phase.key}
            phase={phase}
            expanded={expandedPhases.has(phase.key)}
            onToggle={() => togglePhase(phase.key)}
          />
        ))}
      </div>
    </Card>
  )
}

function PhaseCard({ phase, expanded, onToggle }: { phase: TrajectoryPhase; expanded: boolean; onToggle: () => void }) {
  const badge =
    phase.status === 'done' ? (
      <Badge color="success">Done</Badge>
    ) : phase.status === 'current' ? (
      <Badge color="action">Current</Badge>
    ) : (
      <Badge>Upcoming</Badge>
    )
  const Chevron = expanded ? ChevronUp : ChevronDown

  return (
    <Panel surface="inset" p="md">
      <button type="button" className="w-full text-left" onClick={onToggle} aria-expanded={expanded}>
        <Group justify="space-between" gap="md" wrap="nowrap">
          <div className="min-w-0">
            <Text fw={800} truncate>
              {phase.label}
            </Text>
            <Caption mt={1}>{phase.subtitle}</Caption>
          </div>
          <Group className="shrink-0" gap="xs" wrap="nowrap">
            {badge}
            <Chevron size={16} color="var(--mantine-color-dimmed)" />
          </Group>
        </Group>
      </button>

      {expanded ? (
        <>
          {phase.description ? (
            <Text mt="sm" size="sm" tone="dimmed">
              {phase.description}
            </Text>
          ) : null}
          <div className="mt-3 space-y-1">
            {phase.weeks.map((week) => (
              <WeekRow key={week.index} week={week} />
            ))}
          </div>
        </>
      ) : null}

      {phase.banked ? (
        <ValuePillsPanel
          tone="success"
          label={`Banked at Wk ${phase.banked.atWeekNumber}`}
          values={phase.banked.values}
        />
      ) : null}
      {phase.projected ? (
        <ValuePillsPanel
          tone="action"
          label={`If targets hit — by Wk ${phase.projected.byWeekNumber}`}
          values={phase.projected.values}
        />
      ) : null}
    </Panel>
  )
}

function WeekRow({ week }: { week: TrajectoryWeek }) {
  const current = week.status === 'current'
  const caption = current
    ? `Session ${Math.min(week.sessionsDone + 1, week.sessionsTotal)} of ${week.sessionsTotal} next`
    : week.status === 'done'
      ? `${week.sessionsDone}/${week.sessionsTotal} sessions`
      : `${week.sessionsTotal} sessions`

  return (
    <div
      className="flex items-center gap-3 px-2 py-2"
      style={
        current
          ? {
              backgroundColor: 'var(--vf-action-soft)',
              border: '1px solid var(--vf-action-border)',
              borderRadius: 'var(--mantine-radius-md)',
            }
          : undefined
      }
    >
      <WeekMarker status={week.status} />
      <div className="min-w-0 shrink-0">
        <Text size="sm" fw={700}>
          Week {week.number}
        </Text>
        <Caption>{caption}</Caption>
      </div>
      {week.targets.length ? (
        <Text size="sm" ta="right" className="min-w-0 flex-1">
          {week.targets.map((target, index) => (
            <Fragment key={target.movementId}>
              {index > 0 ? <Text component="span" size="sm" tone="dimmed">{' · '}</Text> : null}
              <TargetSegment target={target} />
            </Fragment>
          ))}
        </Text>
      ) : null}
    </div>
  )
}

function TargetSegment({ target }: { target: TrajectoryLiftTarget }) {
  return (
    <Text component="span" size="sm" tone="dimmed" style={{ whiteSpace: 'nowrap' }}>
      {target.label}{' '}
      <Text component="span" size="sm" fw={700} tone="default">
        {formatLoad(target.load)}
      </Text>
    </Text>
  )
}

function WeekMarker({ status }: { status: TrajectoryWeek['status'] }) {
  if (status === 'done') {
    return (
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--vf-action-text)', color: 'var(--mantine-color-white)' }}
      >
        <Check size={13} strokeWidth={3} />
      </div>
    )
  }
  if (status === 'current') {
    return (
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ border: '2px solid var(--vf-action-text)' }}
      >
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--vf-action-text)' }} />
      </div>
    )
  }
  return (
    <div className="h-6 w-6 shrink-0 rounded-full" style={{ border: '2px solid var(--mantine-color-default-border)' }} />
  )
}

function ValuePillsPanel({
  tone,
  label,
  values,
}: {
  tone: 'success' | 'action'
  label: string
  values: TrajectoryValuePill[]
}) {
  return (
    <Panel
      surface="inset"
      p="sm"
      mt="sm"
      style={{
        borderStyle: 'dashed',
        borderColor: `var(--vf-${tone}-border)`,
        backgroundColor: `var(--vf-${tone}-soft)`,
      }}
    >
      <SectionLabel tone={tone}>{label}</SectionLabel>
      <Group gap="xs" mt={8}>
        {values.map((pill) => (
          <Panel key={pill.movementId} surface="panel" px="sm" py={6} radius="md" shadow="none">
            <Group gap={6} wrap="nowrap">
              <Caption fw={600}>{pill.label}</Caption>
              <Text size="sm" fw={800}>
                {formatLoad(pill.value)}
              </Text>
            </Group>
          </Panel>
        ))}
      </Group>
    </Panel>
  )
}

function formatLoad(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}
