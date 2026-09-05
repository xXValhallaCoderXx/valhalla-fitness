import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { buildProgramPhaseMap } from '@sheetless/domain/program/program-phase-map'
import { buildProgramTimeline } from '@sheetless/domain/program/program-timeline'
import { buildProgramTrajectory } from '@sheetless/domain/program/program-trajectory'
import { Button, EmptyState, PageHeader, Panel, Screen, SettingsHeaderAction, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { programOverviewQueryOptions } from './queries'
import { ProgramEquipmentModeCard } from './ProgramEquipmentModeCard'
import { ProgramHeader } from './ProgramHeader'
import { ProgramPhaseMap } from './ProgramPhaseMap'
import { ProgramTimeline } from './ProgramTimeline'
import { ProgramDetails } from './ProgramDetails'
import { ProgressionReviewAlert } from './ProgressionReviewAlert'
import { ProgressionReviewSheet } from './ProgressionReviewSheet'

export function ProgramScreen() {
  const { user } = useSession()
  const [reviewOpen, setReviewOpen] = useState(false)
  const overview = useQuery({
    ...programOverviewQueryOptions(user!),
    enabled: Boolean(user),
  })
  const settingsAction = <SettingsHeaderAction testID="plan-settings" />

  if (overview.isPending) {
    return (
      <Screen>
        <PageHeader title="Plan" subtitle="Your active program, week by week." actions={settingsAction} />
        <Panel style={{ padding: spacing.md }}><Text tone="dimmed">Loading your plan…</Text></Panel>
      </Screen>
    )
  }
  if (overview.isError) {
    return (
      <Screen>
        <PageHeader title="Plan" actions={settingsAction} />
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
        <PageHeader title="Plan" subtitle="Your active program, week by week." actions={settingsAction} />
        <EmptyState
          title="No active program"
          action={
            <Button
              label="Browse programs"
              onPress={() => router.navigate('/(tabs)/templates')}
              testID="plan-browse-programs"
            />
          }
        >
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
      <ProgramHeader overview={overview.data} phaseMap={phaseMap} action={settingsAction} />
      <ProgramEquipmentModeCard
        key={program.id}
        user={user!}
        program={program}
        hasActiveSession={overview.data.hasActiveSession}
      />
      <ProgressionReviewAlert
        decisions={overview.data.pendingDecisions}
        onReview={() => setReviewOpen(true)}
      />
      <ProgramPhaseMap phaseMap={phaseMap} />
      <ProgramTimeline trajectory={trajectory} />
      <ProgramDetails overview={overview.data} />
      <ProgressionReviewSheet
        key={user!.id}
        open={reviewOpen}
        decisions={overview.data.pendingDecisions}
        units={program.units}
        user={user!}
        contextLabel={program.title}
        onClose={() => setReviewOpen(false)}
      />
    </Screen>
  )
}
