import { useQuery } from '@tanstack/react-query'
import { buildProgramPhaseMap } from '@sheetless/domain/program/program-phase-map'
import { buildProgramTimeline } from '@sheetless/domain/program/program-timeline'
import { buildProgramTrajectory } from '@sheetless/domain/program/program-trajectory'
import { EmptyState, PageHeader, Panel, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing, useTokens } from '@/lib/tokens'
import { programOverviewQueryOptions } from './queries'
import { ProgramHeader } from './ProgramHeader'
import { ProgramPhaseMap } from './ProgramPhaseMap'
import { ProgramTimeline } from './ProgramTimeline'

export function ProgramScreen() {
  const { user } = useSession()
  const { theme } = useTokens()
  const overview = useQuery({
    ...programOverviewQueryOptions(user!),
    enabled: Boolean(user),
  })

  if (overview.isPending) {
    return (
      <Screen>
        <PageHeader title="Plan" subtitle="Your active program, week by week." />
        <Panel style={{ padding: spacing.md }}><Text tone="dimmed">Loading your plan…</Text></Panel>
      </Screen>
    )
  }
  if (overview.isError) {
    return (
      <Screen>
        <PageHeader title="Plan" />
        <EmptyState title="Your plan could not load">
          {overview.error instanceof Error ? overview.error.message : 'Try again in a moment.'}
        </EmptyState>
      </Screen>
    )
  }

  const program = overview.data.activeProgram
  if (!program) {
    return (
      <Screen>
        <PageHeader title="Plan" subtitle="Your active program, week by week." />
        <EmptyState title="No active program">
          Browse Programs to choose a structured training plan.
        </EmptyState>
      </Screen>
    )
  }

  // The query rejects this partial-payload case so React Query can retry it.
  const definition = program.templateDefinition!
  const timeline = buildProgramTimeline(program, definition)
  const phaseMap = buildProgramPhaseMap(timeline)
  const trajectory = buildProgramTrajectory({
    definition,
    currentGlobalIndex: program.currentWeekIndex,
    rounding: program.rounding,
    units: program.units,
    stateValues: overview.data.stateValues,
    acceptedDecisions: overview.data.acceptedDecisions,
    sessionStamps: overview.data.sessionStamps,
  })

  return (
    <Screen>
      <ProgramHeader overview={overview.data} phaseMap={phaseMap} />
      {overview.data.pendingDecisions.length ? (
        <Panel
          surface="inset"
          style={{ borderColor: theme.tones.warning.border, gap: 3, padding: spacing.md }}
        >
          <Text size="sm" tone="warning" weight={800}>Progression review pending</Text>
          <Text size="sm" tone="dimmed">Review load changes on sheetless.fitness.</Text>
        </Panel>
      ) : null}
      <ProgramPhaseMap phaseMap={phaseMap} />
      <ProgramTimeline trajectory={trajectory} />
    </Screen>
  )
}
