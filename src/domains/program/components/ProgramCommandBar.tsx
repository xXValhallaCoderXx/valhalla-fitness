import { Badge, Card, Divider, Group } from '@mantine/core'
import type { ReactNode } from 'react'
import { Heading, SectionLabel, StatValue, Text } from '~/components'
import type { ProgramInstance, ProgramOverview } from '~/shared/types'
import type { ProgramPhaseMap as ProgramPhaseMapModel } from '~/domains/program/lib/program-phase-map'
import { ProgramPhaseMap } from './ProgramPhaseMap'
import { ProgramInfoHint } from './ProgramInfoHint'

/**
 * Program command bar — the page header reimagined: plan identity + Week /
 * Session / Cycle stat tiles on the right, then a full-width phase map, and a
 * slim "tailored to you" note. Answers "what plan, where am I?" in one glance.
 */
export function ProgramCommandBar({
  overview,
  program,
  phaseMap,
}: {
  overview: ProgramOverview
  program: ProgramInstance
  phaseMap: ProgramPhaseMapModel
}) {
  const position = overview.position
  const subtitle = position?.weekSummary ?? position?.focus ?? ''
  const customized = program.customizationStatus === 'customized'
  const cyclePercent = Math.min(100, Math.max(0, Math.round(position?.progressPercent ?? 0)))

  const here = [phaseMap.currentPhaseLabel, phaseMap.currentWaveLabel].filter(Boolean).join(' · ')

  const swaps = program.customizationSummary.movementOverrideCount
  const adds = program.customizationSummary.accessoryAdditionCount
  const tailoredSummary = `Tailored to you: ${swaps} exercise${swaps === 1 ? '' : 's'} swapped, ${adds} accessor${adds === 1 ? 'y' : 'ies'} added. Loads & progress carry on as normal.`

  return (
    <Card p="lg" className="mb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Group gap="xs">
            <SectionLabel>Your plan</SectionLabel>
            {customized ? (
              <Group gap={4} wrap="nowrap">
                <Badge color="warning">Customized</Badge>
                <ProgramInfoHint label="What's customized">{tailoredSummary}</ProgramInfoHint>
              </Group>
            ) : null}
          </Group>
          <Heading order={1} size="h2" mt={6} lh={1.1}>
            {program.title}
          </Heading>
          {subtitle ? (
            <Text mt={4} size="sm" tone="dimmed" lineClamp={2}>
              {subtitle}
            </Text>
          ) : null}
        </div>

        <div className="flex gap-2">
          <StatTile label="Week" value={position?.weekNumber ?? phaseMap.currentWeekNumber} suffix={`/${phaseMap.totalWeeks}`} />
          {position ? <StatTile label="Session" value={position.sessionNumber} suffix={`/${position.daysPerWeek}`} /> : null}
          <StatTile label="Cycle" value={`${cyclePercent}%`} highlight />
        </div>
      </div>

      <Divider my="md" />

      <div className="mb-3 flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-2">
        <Group gap="xs" wrap="nowrap">
          <SectionLabel>Program timeline</SectionLabel>
          <ProgramInfoHint label="What is a wave?">
            Your plan moves in phases made of waves — a few weeks building up, then a lighter week to recover before the next push. The map shows every week and where you are now.
          </ProgramInfoHint>
        </Group>
        {here ? (
          <Text size="xs" tone="dimmed" ta={{ base: 'left', lg: 'right' }}>
            You&apos;re in{' '}
            <Text component="span" size="xs" fw={700}>
              {here}
            </Text>{' '}
            — Week {phaseMap.currentWeekNumber} of {phaseMap.totalWeeks}
          </Text>
        ) : null}
      </div>

      <div className="hidden lg:block">
        <ProgramPhaseMap phaseMap={phaseMap} variant="full" />
      </div>
      <div className="lg:hidden">
        <ProgramPhaseMap phaseMap={phaseMap} variant="compact" />
      </div>
    </Card>
  )
}

function StatTile({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string
  value: ReactNode
  suffix?: string
  highlight?: boolean
}) {
  return (
    <div
      style={{
        flex: '1 1 0',
        textAlign: 'center',
        minWidth: 0,
        backgroundColor: highlight ? 'var(--vf-action-soft)' : 'var(--vf-surface-2)',
        border: `1px solid ${highlight ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
        borderRadius: 'var(--mantine-radius-md)',
        padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
      }}
      className="lg:min-w-[5.5rem]"
    >
      <SectionLabel ta="center" tone={highlight ? 'action' : 'dimmed'}>
        {label}
      </SectionLabel>
      <StatValue size="lg" mt={2} ta="center" tone={highlight ? 'action' : undefined}>
        {value}
        {suffix ? (
          <Text component="span" size="sm" fw={600} tone="dimmed">
            {suffix}
          </Text>
        ) : null}
      </StatValue>
    </div>
  )
}
