import { useQuery } from '@tanstack/react-query'
import { buildProgramPhaseMap } from '@sheetless/domain/program/program-phase-map'
import { buildProgramTimeline } from '@sheetless/domain/program/program-timeline'
import { buildProgramTrajectory } from '@sheetless/domain/program/program-trajectory'
import { EmptyState, PageHeader, Panel, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { programOverviewQueryOptions } from './queries'

export function ProgramScreen() {
  const { user } = useSession()
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
      <PageHeader
        title={program.title}
        eyebrow="Your plan"
        subtitle={`${phaseMap.currentPhaseLabel ?? 'Current phase'} · Week ${trajectory.currentWeekNumber}`}
      />
      <Panel style={{ padding: spacing.md }}>
        <Text tone="dimmed">Your full timeline is ready.</Text>
      </Panel>
    </Screen>
  )
}
