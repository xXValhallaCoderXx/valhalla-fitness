import { Badge, Card, Group, SimpleGrid } from '@mantine/core'
import { Caption, Panel, SectionLabel, StatValue, Text } from '~/components'
import type { ProgramInstance, ProgramOverview } from '~/shared/types'
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
  return (
    <Card p="md">
      <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
        <div>
          <Group gap="xs">
            <SectionLabel>Current loads</SectionLabel>
            <ProgramInfoHint label="What are current loads?">
              Program state stores the current training maxes or working loads used to calculate planned loads. Accepted progression decisions update the relevant value for future sessions.
            </ProgramInfoHint>
          </Group>
          <Caption mt={4}>Training maxes and working loads used for prescriptions.</Caption>
        </div>
        <Badge>{program.units}</Badge>
      </Group>
      <SimpleGrid cols={2} spacing="xs" mt="sm">
        {overview.stateValues.map((state) => (
          <Panel key={state.stateKey} surface="inset" p="sm">
            <Caption>{state.movementName}</Caption>
            <StatValue mt={4}>
              {formatNumber(state.value)} <Caption component="span">{state.units}</Caption>
            </StatValue>
            <SectionLabel mt={4}>
              {state.pendingDecision ? 'pending review' : state.lastAcceptedDecision ? 'last change saved' : state.stateType.replaceAll('_', ' ')}
            </SectionLabel>
          </Panel>
        ))}
      </SimpleGrid>
    </Card>
  )
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
      <SectionLabel tone="warning">Customized from default</SectionLabel>
      <Text mt={4} size="sm">
        This programme changes {program.customizationSummary.movementOverrideCount} movement slot
        {program.customizationSummary.movementOverrideCount === 1 ? '' : 's'} and adds{' '}
        {program.customizationSummary.accessoryAdditionCount} accessory slot
        {program.customizationSummary.accessoryAdditionCount === 1 ? '' : 's'} from the original template.
      </Text>
    </Card>
  )
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}
