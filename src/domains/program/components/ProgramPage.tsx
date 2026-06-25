import { Badge, Button, Card, Tooltip } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Activity, ArrowRight, CalendarDays, Check, Dumbbell, Info, ListChecks, Target } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import { buildProgramTimeline, type ProgramTimelineModel } from '~/domains/program/lib/program-timeline'
import type { BodyLoadRegion, ProgramInstance, ProgramOverview } from '~/shared/types'
import { EmptyState, Page, PageHeader, PageLoadError, PageSkeleton } from '~/components'
import { PendingProgressionReviewModal, PendingReviewAlert, useResolveProgressionDecision } from './PendingReview'

export function ProgramPage({ user }: { user: unknown }) {
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to review your program">Program timelines and load state are account data.</EmptyState>
      </Page>
    )
  }
  return <AuthedProgram />
}

function AuthedProgram() {
  const overviewQuery = useQuery(programOverviewQueryOptions())
  const [reviewOpen, setReviewOpen] = useState(false)
  const [resolvedDecisionIds, setResolvedDecisionIds] = useState<Set<string>>(() => new Set())
  const pendingDecisions = (overviewQuery.data?.pendingDecisions ?? []).filter((decision) => !resolvedDecisionIds.has(decision.id))
  const decisionMutation = useResolveProgressionDecision({
    onResolved: (decisionId) => {
      setResolvedDecisionIds((current) => new Set(current).add(decisionId))
      const remainingDecisions = (overviewQuery.data?.pendingDecisions ?? []).filter(
        (decision) => decision.id !== decisionId && !resolvedDecisionIds.has(decision.id),
      )
      if (!remainingDecisions.length) setReviewOpen(false)
    },
  })

  if (overviewQuery.isPending) return <PageSkeleton />
  if (overviewQuery.isError) return <PageLoadError error={overviewQuery.error} onRetry={() => void overviewQuery.refetch()} />

  const overview = overviewQuery.data

  const program = overview.activeProgram
  if (!program) {
    return (
      <Page>
        <EmptyState title="No active program">Start a template to see its timeline and current loads here.</EmptyState>
      </Page>
    )
  }

  const timeline = buildProgramTimeline(program, program.templateDefinition)

  return (
    <Page>
      <PageHeader
        title={program.title}
        eyebrow="Program"
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {program.customizationStatus === 'customized' ? <Badge color="warning">Customized</Badge> : null}
            <Badge color="action">Week {overview.position?.weekNumber ?? timeline.currentWeekIndex + 1} of {timeline.totalWeeks}</Badge>
          </div>
        }
      >
        <span className="block">{overview.position?.weekSummary ?? timeline.description}</span>
        <span className="mt-1 block text-[11px] font-semibold text-[var(--mantine-color-dimmed)] md:text-xs">
          Current position: {overview.position?.phaseLabel ?? 'Current phase'} · session {overview.position?.sessionNumber ?? timeline.currentSessionInWeek + 1} of {timeline.daysPerWeek}
        </span>
      </PageHeader>

      <PendingReviewAlert decisions={pendingDecisions} onReview={() => setReviewOpen(true)} className="mb-4" />

      <ProgramSummaryGrid overview={overview} timeline={timeline} />

      <ProgramLoadChips overview={overview} program={program} />

      {program.customizationStatus === 'customized' ? (
        <div className="hidden lg:block">
          <CustomizationCard program={program} />
        </div>
      ) : null}

      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ProgramTimeline key={timeline.currentWeekIndex} timeline={timeline} status={program.status} currentSessionIndex={program.currentWeekIndex} />

        <div className="space-y-4">
          <CurrentLoadsCard overview={overview} program={program} />
          <RecentProgramSessions overview={overview} />
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        <ProgramMobileSection title="Full timeline" badge={`${timeline.totalWeeks} weeks`}>
          <ProgramTimeline key={`mobile-${timeline.currentWeekIndex}`} timeline={timeline} status={program.status} currentSessionIndex={program.currentWeekIndex} />
        </ProgramMobileSection>
        <ProgramMobileSection title="Current loads" badge={program.units}>
          <CurrentLoadsCard overview={overview} program={program} />
        </ProgramMobileSection>
        <ProgramMobileSection title="Recent sessions" badge={overview.recentSessions.length}>
          <RecentProgramSessions overview={overview} />
        </ProgramMobileSection>
        {program.customizationStatus === 'customized' ? (
          <ProgramMobileSection title="Customization" badge="Custom">
            <CustomizationCard program={program} />
          </ProgramMobileSection>
        ) : null}
      </div>
      <PendingProgressionReviewModal
        opened={reviewOpen}
        decisions={pendingDecisions}
        isSaving={decisionMutation.isPending}
        onClose={() => setReviewOpen(false)}
        onResolve={(decisionId, action) => decisionMutation.mutate({ decisionId, action })}
      />
    </Page>
  )
}

function ProgramSummaryGrid({
  overview,
  timeline,
}: {
  overview: ProgramOverview
  timeline: ProgramTimelineModel
}) {
  const position = overview.position
  const nextSession = overview.nextSession
  const topRegions = overview.bodyLoad.topRegions.slice(0, 3)

  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_1fr_0.9fr]">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="vf-section-label">Current position</h2>
              <InfoHint label="Current position">
                This is derived from the active template definition and the program's current session index.
              </InfoHint>
            </div>
            <h3 className="mt-2 text-lg font-extrabold">{position?.phaseLabel ?? 'Current phase'}</h3>
            <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">{position?.weekLabel ?? timeline.weeks[timeline.currentWeekIndex]?.subtitle}</p>
          </div>
          <Badge color={hardnessColor(position?.hardness)}>{position?.hardness ?? 'Current'}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SummaryMetric icon={<CalendarDays size={14} />} label="Week" value={`${position?.weekNumber ?? timeline.currentWeekIndex + 1}/${timeline.totalWeeks}`} />
          <SummaryMetric icon={<ListChecks size={14} />} label="Session" value={`${position?.sessionNumber ?? timeline.currentSessionInWeek + 1}/${timeline.daysPerWeek}`} />
          <SummaryMetric icon={<Target size={14} />} label="Progress" value={`${position?.progressPercent ?? 0}%`} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--vf-surface-inset)]">
          <div className="h-full rounded-full bg-[var(--mantine-primary-color-filled)]" style={{ width: `${Math.min(100, Math.max(0, position?.progressPercent ?? 0))}%` }} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">{position?.focus}</p>
      </Card>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="vf-section-label">Next session</h2>
            <h3 className="mt-2 truncate text-lg font-extrabold">{nextSession?.title ?? 'No session queued'}</h3>
            <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">{nextSession?.movementSummary ?? 'Start a program to queue work.'}</p>
          </div>
          <Badge color={nextSession?.status === 'in_progress' ? 'warning' : nextSession?.status === 'completed' ? 'success' : 'action'}>
            {nextSession?.status.replaceAll('_', ' ') ?? 'planned'}
          </Badge>
        </div>
        <details className="mt-3 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <summary className="cursor-pointer list-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-[var(--mantine-color-dimmed)]">Key work</p>
                <p className="mt-1 text-sm font-bold">{nextSession?.keyPrescription ?? 'No prescription'}</p>
              </div>
              <span className="shrink-0 text-[10px] font-extrabold uppercase text-[var(--mantine-color-dimmed)]">
                {nextSession?.movements.length ? `${nextSession.movements.length} movements` : 'Details'}
              </span>
            </div>
          </summary>
          {nextSession?.movements.length ? (
            <div className="mt-3 space-y-1.5 border-t border-[var(--mantine-color-default-border)] pt-3">
              {nextSession.movements.map((movement, index) => (
                <div key={`${movement.role}-${movement.movementName}-${index}`} className="flex items-start justify-between gap-3 rounded-md bg-[var(--mantine-color-default)] px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{movement.movementName}</p>
                    <p className="truncate text-[10px] text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-extrabold uppercase text-[var(--mantine-color-dimmed)]">{movement.role}</span>
                </div>
              ))}
            </div>
          ) : null}
        </details>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <SummaryMetric icon={<Dumbbell size={14} />} label="Main" value={nextSession?.mainCount ?? 0} />
          <SummaryMetric icon={<Dumbbell size={14} />} label="Variations" value={nextSession?.variationCount ?? 0} />
          <SummaryMetric icon={<ListChecks size={14} />} label="Accessories" value={nextSession?.accessoryCount ?? 0} />
        </div>
        {nextSession ? (
          <Link to={nextSession.href}>
            <Button className="mt-3 w-full" variant="light">
              <ArrowRight size={14} />
              Open session
            </Button>
          </Link>
        ) : null}
      </Card>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="vf-section-label">Body load</h2>
            <p className="mt-2 text-lg font-extrabold">{overview.bodyLoad.freshRegionCount} fresh regions</p>
          </div>
          <Activity size={18} className="text-[var(--vf-action-text)]" />
        </div>
        <div className="mt-3 space-y-2">
          {topRegions.length ? topRegions.map((region) => (
            <BodyLoadMiniRow key={region.regionId} region={region} />
          )) : (
            <p className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 text-sm text-[var(--mantine-color-dimmed)]">No recent completed sets.</p>
          )}
        </div>
        <Link to="/history">
          <Button className="mt-3 w-full" variant="default">
            <Activity size={14} />
            Insights
          </Button>
        </Link>
      </Card>
    </div>
  )
}

function ProgramLoadChips({
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
        <div
          key={state.stateKey}
          className="min-w-[9rem] rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-3 py-2"
        >
          <p className="truncate text-[11px] font-semibold text-[var(--mantine-color-dimmed)]">{state.movementName}</p>
          <p className="mt-0.5 text-base font-black">
            {formatNumber(state.value)} <span className="text-[10px] text-[var(--mantine-color-dimmed)]">{state.units ?? program.units}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

function CurrentLoadsCard({
  overview,
  program,
}: {
  overview: ProgramOverview
  program: ProgramInstance
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="vf-section-label">Current Loads</h2>
            <InfoHint label="What are current loads?">
              Program state stores the current training maxes or working loads used to calculate planned loads. Accepted progression decisions update the relevant value for future sessions.
            </InfoHint>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">Training maxes and working loads used for prescriptions.</p>
        </div>
        <Badge>{program.units}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {overview.stateValues.map((state) => (
          <div key={state.stateKey} className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
            <p className="text-xs text-[var(--mantine-color-dimmed)]">{state.movementName}</p>
            <p className="mt-1 text-lg font-bold">
              {formatNumber(state.value)} <span className="text-xs text-[var(--mantine-color-dimmed)]">{state.units}</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
              {state.pendingDecision ? 'pending review' : state.lastAcceptedDecision ? 'last change saved' : state.stateType.replaceAll('_', ' ')}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function CustomizationCard({ program }: { program: ProgramInstance }) {
  return (
    <Card className="mb-4 border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-4">
      <p className="vf-section-label text-[var(--vf-warning-text)]">Customized from default</p>
      <p className="mt-1 text-sm text-[var(--mantine-color-text)]">
        This programme changes {program.customizationSummary.movementOverrideCount} movement slot
        {program.customizationSummary.movementOverrideCount === 1 ? '' : 's'} and adds{' '}
        {program.customizationSummary.accessoryAdditionCount} accessory slot
        {program.customizationSummary.accessoryAdditionCount === 1 ? '' : 's'} from the original template.
      </p>
    </Card>
  )
}

function ProgramMobileSection({
  title,
  badge,
  children,
}: {
  title: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <details className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] shadow-[var(--vf-shadow-card)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="vf-section-label">{title}</span>
        {badge ? <Badge>{badge}</Badge> : null}
      </summary>
      <div className="border-t border-[var(--mantine-color-default-border)] p-3">
        {children}
      </div>
    </details>
  )
}

function RecentProgramSessions({ overview }: { overview: ProgramOverview }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="vf-section-label">Recent program sessions</h2>
        <Badge>{overview.recentSessions.length}</Badge>
      </div>
      {overview.recentSessions.length ? (
        <div className="mt-3 space-y-2">
          {overview.recentSessions.map((session) => (
            <div key={session.id} className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{session.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">{session.weekLabel ?? 'Completed session'}</p>
                </div>
                <Badge color="success">{session.completedSetCount}/{session.plannedSetCount}</Badge>
              </div>
              {session.topSetHighlights.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {session.topSetHighlights.map((highlight) => (
                    <span key={highlight} className="rounded-md border border-[var(--vf-accent-border)] bg-[var(--vf-accent-soft)] px-2 py-1 text-[10px] font-bold text-[var(--vf-accent-text)]">
                      {highlight}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--mantine-color-dimmed)]">No top-set highlight.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">No completed sessions for this program yet.</p>
      )}
    </Card>
  )
}

function SummaryMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[var(--mantine-color-dimmed)]">{icon}</span>
        <span className="text-sm font-black">{value}</span>
      </div>
      <p className="mt-1 text-[10px] font-bold text-[var(--mantine-color-dimmed)]">{label}</p>
    </div>
  )
}

function BodyLoadMiniRow({ region }: { region: BodyLoadRegion }) {
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-extrabold">{region.label}</p>
        <span className="text-xs font-black">{region.impactPercent}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--vf-surface-inset)]">
        <div className={bodyLoadBarClass(region.tier)} style={{ width: `${region.impactPercent}%` }} />
      </div>
    </div>
  )
}

function bodyLoadBarClass(tier: BodyLoadRegion['tier']) {
  const base = 'h-full rounded-full '
  if (tier === 'high') return `${base}bg-[var(--vf-danger-text)]`
  if (tier === 'moderate') return `${base}bg-[var(--vf-warning-text)]`
  if (tier === 'low') return `${base}bg-[var(--vf-action-text)]`
  return `${base}bg-[var(--mantine-color-dimmed)]`
}

function hardnessColor(hardness?: string | null) {
  if (hardness === 'Hard') return 'danger'
  if (hardness === 'Medium') return 'warning'
  if (hardness === 'Light') return 'success'
  return 'neutral'
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function ProgramTimeline({
  currentSessionIndex,
  status,
  timeline,
}: {
  currentSessionIndex: number
  status: string
  timeline: ProgramTimelineModel
}) {
  const [expandedWeeks, setExpandedWeeks] = useState(() => new Set([timeline.currentWeekIndex]))

  const toggleWeek = (weekIndex: number) => {
    setExpandedWeeks((current) => {
      const next = new Set(current)
      if (next.has(weekIndex)) {
        next.delete(weekIndex)
      } else {
        next.add(weekIndex)
      }
      return next
    })
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="vf-section-label">Timeline</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">{timeline.description}</p>
        </div>
        <Badge color="action">{status}</Badge>
      </div>
      <div
        className="relative mt-4 space-y-3 overflow-y-auto pr-2 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-[var(--mantine-color-default-border)]"
        style={{ maxHeight: 'min(72vh, 44rem)' }}
      >
        {timeline.weeks.map((week) => {
          const current = week.index === timeline.currentWeekIndex
          const complete = week.index < timeline.currentWeekIndex
          const expanded = expandedWeeks.has(week.index)
          return (
            <div key={week.index} className="relative z-10 flex gap-3">
              <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-[var(--mantine-color-body)] ${complete ? 'bg-[var(--mantine-color-success-filled)] text-white' : current ? 'bg-[var(--mantine-primary-color-filled)] text-white shadow-sm' : 'bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]'}`}>
                {complete ? <Check size={12} /> : current ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : <span className="h-2 w-2 rounded-full bg-[var(--mantine-color-default-border)]" />}
              </div>
              <div
                className={`flex-1 rounded-lg border p-3 ${
                  current
                    ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--vf-action-soft)]'
                    : complete
                      ? 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] opacity-70'
                      : 'border-dashed border-[var(--mantine-color-default-border)] bg-transparent'
                }`}
              >
                <button type="button" className="w-full text-left" onClick={() => toggleWeek(week.index)}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-extrabold">Week {week.index + 1}</p>
                      <p className="text-xs text-[var(--mantine-color-dimmed)]">{week.subtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {complete ? <Badge color="success">Done</Badge> : current ? <Badge color="action">Current</Badge> : <Badge>Locked</Badge>}
                      <span className="text-xs font-bold text-[var(--mantine-color-dimmed)]">{expanded ? 'Hide' : 'Details'}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">{week.summary}</p>
                </button>

                {expanded ? (
                  <div className="mt-3 space-y-2 border-t border-[var(--mantine-color-default-border)] pt-3">
                    {week.sessions.map((session) => (
                      <details
                        key={session.label}
                        className={`rounded-md border bg-[var(--vf-surface-2)] px-3 py-2 text-xs ${
                          session.globalIndex === currentSessionIndex
                            ? 'border-[var(--vf-action-border)]'
                            : session.globalIndex < currentSessionIndex
                              ? 'border-[var(--vf-success-border)] opacity-75'
                              : 'border-[var(--mantine-color-default-border)]'
                        }`}
                      >
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <span className="font-extrabold text-[var(--mantine-color-text)]">{session.label}: {session.title}</span>
                            <span className="font-semibold text-[var(--mantine-color-dimmed)]">{session.movementSummary}</span>
                          </div>
                        </summary>
                        <div className="mt-2 grid gap-2 border-t border-[var(--mantine-color-default-border)] pt-2 sm:grid-cols-2 xl:grid-cols-3">
                          {session.movements.map((movement, index) => (
                            <TimelineSessionDetail
                              key={`${movement.roleLabel}-${movement.movementName}-${index}`}
                              label={movement.roleLabel}
                              movementName={movement.movementName}
                              targetSummary={movement.targetSummary}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-[var(--mantine-color-dimmed)]">{session.progressionNote}</p>
                      </details>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function TimelineSessionDetail({
  label,
  movementName,
  targetSummary,
}: {
  label: string
  movementName: string
  targetSummary: string
}) {
  return (
    <div className="rounded-lg bg-[var(--mantine-color-default)] p-2">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--mantine-color-text)]">{movementName}</p>
      <p className="mt-0.5 text-[11px] text-[var(--mantine-color-dimmed)]">{targetSummary}</p>
    </div>
  )
}

function InfoHint({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip
      label={children}
      multiline
      withArrow
      withinPortal
      position="top"
      w={280}
      classNames={{
        tooltip: '!border !border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-dimmed)] !shadow-[var(--vf-shadow-panel)]',
        arrow: '!border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)]',
      }}
    >
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)] transition hover:border-[var(--vf-action-border)] hover:text-[var(--vf-action-text)] focus-visible:border-[var(--mantine-primary-color-filled)] focus-visible:outline-none"
      >
        <Info size={12} />
      </button>
    </Tooltip>
  )
}
