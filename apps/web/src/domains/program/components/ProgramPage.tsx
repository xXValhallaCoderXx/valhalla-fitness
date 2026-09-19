import { Button } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { buildTodayWeek } from '@sheetless/domain/session/today-week'
import { guidedWeekCharacter } from '@sheetless/domain/program/week-character'
import { EmptyState, InspectorLayout, Page, PageLoadError, PageSkeleton, ScreenHeader } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { equipmentModeLabel } from '@sheetless/domain/program/equipment-mode-labels'
import type { ProgramOverview, ProgramInstance } from '~/domains/program'
import { SessionRecapModal } from '~/domains/session/components/SessionRecapModal'
import { ShowFormulasToggle } from '~/domains/session/components/today/ShowFormulasToggle'
import { buildCycleInspector } from '~/domains/program/lib/cycle-inspector'
import { buildProgramPhaseMap } from '~/domains/program/lib/program-phase-map'
import { buildProgramTimeline } from '~/domains/program/lib/program-timeline'
import { buildProgramTrajectory } from '~/domains/program/lib/program-trajectory'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { CycleInspectorPanel } from './inspector/CycleInspectorPanel'
import { PendingProgressionReviewModal, PendingReviewAlert } from './PendingReview'
import { ProgramExplainerCards } from './ProgramExplainerCards'
import { ProgramFooterRule } from './ProgramFooterRule'
import { ProgramNextSession } from './ProgramNextSession'
import { ProgramReferenceTable } from './ProgramReferenceTable'
import { ProgramTimeline } from './ProgramTimeline'
import { ProgramWeekSessions } from './ProgramWeekSessions'
import { ProgramWeekStrip } from './ProgramWeekStrip'
import { ProgrammeSettingsPanel } from './ProgrammeSettingsPanel'

export function ProgramPage({ user }: { user: AuthUser | null }) {
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to review your programme">Programme timelines and load state are account data.</EmptyState>
      </Page>
    )
  }
  return <AuthedProgram />
}

function AuthedProgram() {
  const userId = useRequiredAccountId()
  const { isFull } = useExperienceMode()
  const overviewQuery = useQuery(programOverviewQueryOptions(userId))
  const [reviewOpen, setReviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cycleOpen, setCycleOpen] = useState(false)
  const [recapSessionId, setRecapSessionId] = useState<string | null>(null)
  const [viewWeekIndex, setViewWeekIndex] = useState<number | null>(null)
  const [resolvedDecisionIds, setResolvedDecisionIds] = useState<Set<string>>(() => new Set())
  const pendingDecisions = (overviewQuery.data?.pendingDecisions ?? []).filter((decision) => !resolvedDecisionIds.has(decision.id))

  if (overviewQuery.isPending) return <PageSkeleton />
  if (overviewQuery.isError) return <PageLoadError error={overviewQuery.error} onRetry={() => void overviewQuery.refetch()} />

  const overview = overviewQuery.data
  const program = overview.activeProgram

  if (!program) {
    return (
      <Page>
        <EmptyState
          centered
          title="No active programme"
          action={
            <Link to="/templates">
              <Button>Browse plans</Button>
            </Link>
          }
        >
          Choose a training template to view your programme timeline, progression schedule, and current training loads.
        </EmptyState>
      </Page>
    )
  }

  // The server always pins a definition on the active program (with its own fallback), so a
  // missing one means a partial payload — retry rather than crash on a client-side fallback.
  const definition = program.templateDefinition
  if (!definition) {
    return <PageLoadError error={new Error('Programme definition unavailable')} onRetry={() => void overviewQuery.refetch()} />
  }

  const position = overview.position
  const week = buildTodayWeek(program, definition, viewWeekIndex ?? undefined)
  const phaseMap = buildProgramPhaseMap(buildProgramTimeline(program, definition))
  const weekNumber = position?.weekNumber ?? phaseMap.currentWeekNumber
  const totalWeeks = position?.totalWeeks ?? phaseMap.totalWeeks

  const subtitle = [
    `Week ${weekNumber} of ${totalWeeks}`,
    isFull ? position?.phaseLabel : position?.hardness ? guidedWeekCharacter[position.hardness] : null,
    isFull ? position?.hardness : null,
    position?.daysPerWeek ? `${position.daysPerWeek} days a week` : null,
    isFull ? `rounding ${program.rounding} ${program.units}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const eyebrow = isFull
    ? `Plan · ${definition.durationWeeks} wk · ${definition.daysPerWeek} d`
    : 'Plan'

  return (
    <Page>
      <ScreenHeader
        data-testid="program-header"
        eyebrow={eyebrow}
        title={program.title}
        subtitle={subtitle}
        actions={
          <>
            <ShowFormulasToggle />
            <Button
              variant="default"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
            >
              <SlidersHorizontal size={15} />
              Programme settings
            </Button>
          </>
        }
      />

      {settingsOpen ? (
        <ProgrammeSettingsPanel program={program} hasActiveSession={overview.hasActiveSession} />
      ) : null}

      <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />

      <InspectorLayout inspector={<CycleInspector overview={overview} definition={definition} weekNumber={weekNumber} totalWeeks={totalWeeks} />}>
        <div className="grid gap-4">
          <ProgramWeekStrip
            definition={definition}
            currentWeekNumber={weekNumber}
            selectedWeekNumber={week ? week.weekNumber : undefined}
            onSelectWeek={setViewWeekIndex}
          />

          {/* Guided leads with what to do next; Full's inspector already answers that. */}
          {!isFull && overview.nextSession && (week?.isCurrent ?? true) ? (
            <ProgramNextSession
              nextSession={overview.nextSession}
              meta={nextSessionMeta(
                overview.nextSession.movements.length,
                week?.sessions.find((session) => session.status === 'next')?.estimatedMinutes,
                program.equipmentMode,
              )}
            />
          ) : null}

          <div className={isFull ? 'grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : 'grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]'}>
            {week ? (
              <ProgramWeekSessions
                week={week}
                sessionStamps={overview.sessionStamps}
                onOpenSession={setRecapSessionId}
                onBackToCurrent={() => setViewWeekIndex(null)}
              />
            ) : null}
            <div className="lg:border-l lg:pl-6" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
              <ProgramReferenceTable states={overview.stateValues} program={program} />
            </div>
          </div>

          {!isFull ? <ProgramExplainerCards /> : null}

          <ProgramFooterRule
            program={program}
            cycleOpen={cycleOpen}
            onToggleCycle={() => setCycleOpen((open) => !open)}
          />

          {cycleOpen ? <FullCycle overview={overview} /> : null}
        </div>
      </InspectorLayout>

      <SessionRecapModal sessionId={recapSessionId} onClose={() => setRecapSessionId(null)} />

      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        onClose={() => setReviewOpen(false)}
        onResolved={(decisionId) => setResolvedDecisionIds((current) => new Set(current).add(decisionId))}
      />
    </Page>
  )
}

/** "6 movements · about 75 min · free weights only" — the band's context line. */
function nextSessionMeta(
  movements: number,
  estimatedMinutes: number | undefined,
  equipmentMode: ProgramInstance['equipmentMode'],
): string {
  return [
    `${movements} ${movements === 1 ? 'movement' : 'movements'}`,
    estimatedMinutes ? `about ${estimatedMinutes} min` : null,
    equipmentMode === 'free_weight' ? equipmentModeLabel(equipmentMode) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** The per-lift weekly targets, kept behind "View full cycle" rather than deleted with the old layout. */
function FullCycle({ overview }: { overview: ProgramOverview }) {
  const program = overview.activeProgram!
  const definition = program.templateDefinition!
  const trajectory = buildProgramTrajectory({
    definition,
    currentGlobalIndex: program.currentWeekIndex,
    loadAdjustments: program.loadAdjustments,
    returnSettings:
      program.returnPeriod?.status === 'active' || program.returnPeriod?.status === 'review'
        ? program.returnPeriod.settings
        : undefined,
    rounding: program.rounding,
    units: program.units,
    stateValues: overview.stateValues,
    acceptedDecisions: overview.acceptedDecisions,
    sessionStamps: overview.sessionStamps,
  })
  return <ProgramTimeline key={trajectory.currentWeekNumber} trajectory={trajectory} />
}

function CycleInspector({
  overview,
  definition,
  weekNumber,
  totalWeeks,
}: {
  overview: ProgramOverview
  definition: NonNullable<ProgramInstance['templateDefinition']>
  weekNumber: number
  totalWeeks: number
}) {
  const program = overview.activeProgram!
  const model = buildCycleInspector({
    definition,
    weekNumber,
    totalWeeks,
    stateValues: overview.stateValues,
    decisions: [...overview.pendingDecisions, ...overview.acceptedDecisions],
    rounding: program.rounding,
  })
  return <CycleInspectorPanel model={model} units={program.units} />
}
