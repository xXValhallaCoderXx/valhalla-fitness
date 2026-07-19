import { Badge, Card, Group, SimpleGrid } from '@mantine/core'
import { Caption, Panel, SectionLabel, StatValue, Text } from '~/components'
import type { ProgramInstance, ProgramOverview, ProgramStateOverview } from '~/shared/types'
import { formatRelativeTime } from '~/shared/lib/dates'
import { ProgramInfoHint } from './ProgramInfoHint'

export function ProgramLoadChips({
  overview,
  program,
}: {
  overview: ProgramOverview
  program: ProgramInstance
}) {
  if (!overview.stateValues.length) return null

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {overview.stateValues.map((state) => (
        <Panel key={state.stateKey} surface="inset" px="sm" py="xs" style={{ minWidth: '9rem' }}>
          <Caption fw={600} truncate>
            {state.movementName}
          </Caption>
          <StatValue size="md" mt={2}>
            {formatNumber(state.value)} <Caption component="span" size="0.625rem">{state.units ?? program.units}</Caption>
          </StatValue>
        </Panel>
      ))}
    </div>
  )
}

export function CurrentLoadsCard({
  overview,
  program,
}: {
  overview: ProgramOverview
  program: ProgramInstance
}) {
  const states = overview.stateValues
  // Lead with the most recently progressed lift — it's the freshest win.
  const hero = states.reduce<ProgramStateOverview | null>((top, state) => {
    if (!top) return state
    if (!state.updatedAt) return top
    if (!top.updatedAt) return state
    return Date.parse(state.updatedAt) > Date.parse(top.updatedAt) ? state : top
  }, null)
  const rest = states.filter((state) => state !== hero)

  return (
    <Card p="md">
      <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
        <div>
          <Group gap="xs">
            <SectionLabel>Current training maxes</SectionLabel>
            <ProgramInfoHint label="Why these numbers?">
              Each planned weight is a percentage of your training max — a strength number set a little below your
              true max so the weights stay doable. Sheetless nudges it up or down based on how your sessions actually
              go.
            </ProgramInfoHint>
          </Group>
          <Caption mt={4}>Every planned weight on this page is computed from these.</Caption>
        </div>
        <Badge style={{ flexShrink: 0 }}>{program.units}</Badge>
      </Group>

      {hero ? <HeroLoadRow state={hero} /> : null}

      <SimpleGrid cols={2} spacing="xs" mt="xs">
        {rest.map((state) => (
          <Panel key={state.stateKey} surface="inset" p="sm">
            <Caption fw={600} truncate>
              {state.movementName}
            </Caption>
            <Group justify="space-between" align="flex-end" gap="xs" wrap="nowrap">
              <StatValue mt={4}>
                {formatNumber(state.value)} <Caption component="span">{state.units}</Caption>
              </StatValue>
              <DeltaText state={state} />
            </Group>
            {state.pendingDecision ? (
              <Caption mt={2} tone="warning" fw={600}>
                pending review
              </Caption>
            ) : null}
          </Panel>
        ))}
      </SimpleGrid>
    </Card>
  )
}

function HeroLoadRow({ state }: { state: ProgramStateOverview }) {
  const delta = state.value - state.startValue
  return (
    <Panel surface="inset" p="sm" mt="sm">
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <div className="min-w-0">
          <Text fw={700} truncate>
            {state.movementName}
          </Text>
          <Caption mt={1} truncate>
            {state.updatedAt ? `updated ${formatRelativeTime(state.updatedAt)}` : stateTypeLabel(state)}
          </Caption>
        </div>
        <Group className="shrink-0" gap="sm" wrap="nowrap" align="center">
          {delta !== 0 ? (
            <Badge color="success" variant="light">
              {formatDelta(delta)} {state.units} since Wk 1
            </Badge>
          ) : null}
          <StatValue size="xl">
            {formatNumber(state.value)} <Caption component="span">{state.units}</Caption>
          </StatValue>
        </Group>
      </Group>
      {state.pendingDecision ? (
        <Caption mt={4} tone="warning" fw={600}>
          pending review
        </Caption>
      ) : null}
    </Panel>
  )
}

function DeltaText({ state }: { state: ProgramStateOverview }) {
  const delta = state.value - state.startValue
  if (delta === 0) return null
  return (
    <Text size="sm" fw={700} tone={delta > 0 ? 'success' : 'danger'} style={{ whiteSpace: 'nowrap' }}>
      {formatDelta(delta)}
    </Text>
  )
}

function stateTypeLabel(state: ProgramStateOverview) {
  return state.stateType.replaceAll('_', ' ')
}

function formatDelta(delta: number) {
  return `${delta > 0 ? '+' : ''}${formatNumber(delta)}`
}

export function CustomizationCard({ program }: { program: ProgramInstance }) {
  return (
    <Card
      p="md"
      className="mb-4"
      style={{
        backgroundColor: 'var(--vf-warning-soft)',
        borderColor: 'var(--vf-warning-border)',
      }}
    >
      <SectionLabel tone="warning">Tailored to you</SectionLabel>
      <Text mt={4} size="sm">
        You&apos;ve tweaked this plan: {program.customizationSummary.movementOverrideCount} exercise
        {program.customizationSummary.movementOverrideCount === 1 ? '' : 's'} swapped and{' '}
        {program.customizationSummary.accessoryAdditionCount} extra{' '}
        {program.customizationSummary.accessoryAdditionCount === 1 ? 'accessory' : 'accessories'} added to the original.
        Your loads and progress carry on as normal.
      </Text>
    </Card>
  )
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}
