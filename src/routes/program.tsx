import { Badge, Button, Card, Tooltip } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Activity, ArrowRight, CalendarDays, Check, Clock3, Dumbbell, Info, ListChecks, Target, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { programOverviewQueryOptions } from '~/lib/query-options'
import { loadRouteQuery } from '~/lib/route-loading'
import { buildProgramTimeline, type ProgramTimelineModel } from '~/lib/program-timeline'
import { resolveProgressionDecisionFn } from '~/server/api'
import type { BodyLoadRegion, ProgramOverview } from '~/types/training'
import { EmptyState, Page, PageHeader, PageLoadError, PageSkeleton } from '~/components/ui'

export const Route = createFileRoute('/program')({
  loader: async ({ context }) => {
    if ((context as any).user) {
      await loadRouteQuery(context.queryClient, programOverviewQueryOptions())
    }
  },
  component: ProgramRoute,
})

function ProgramRoute() {
  const user = (Route.useRouteContext() as any).user
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to review your program">Program timelines and anchors are account data.</EmptyState>
      </Page>
    )
  }
  return <AuthedProgram />
}

function AuthedProgram() {
  const queryClient = useQueryClient()
  const overviewQuery = useQuery(programOverviewQueryOptions())
  const mutation = useMutation({
    mutationFn: (data: { decisionId: string; action: 'accepted' | 'dismissed' | 'pending' }) =>
      resolveProgressionDecisionFn({ data }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
      ])
      notifications.show({ color: 'success', title: 'Progression updated', message: 'Your decision was saved.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not save decision',
        message: getApiErrorMessage(error, 'Unable to save progression decision'),
      })
    },
  })

  if (overviewQuery.isPending) return <PageSkeleton />
  if (overviewQuery.isError) return <PageLoadError error={overviewQuery.error} onRetry={() => void overviewQuery.refetch()} />

  const overview = overviewQuery.data

  const program = overview.activeProgram
  if (!program) {
    return (
      <Page>
        <EmptyState title="No active program">Start a template to see its timeline and anchors here.</EmptyState>
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

      <ProgramSummaryGrid overview={overview} timeline={timeline} />

      {program.customizationStatus === 'customized' ? (
        <Card className="mb-4 border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-4">
          <p className="vf-section-label text-[var(--vf-warning-text)]">Customized from default</p>
          <p className="mt-1 text-sm text-[var(--mantine-color-text)]">
            This programme changes {program.customizationSummary.movementOverrideCount} movement slot
            {program.customizationSummary.movementOverrideCount === 1 ? '' : 's'} and adds{' '}
            {program.customizationSummary.accessoryAdditionCount} accessory slot
            {program.customizationSummary.accessoryAdditionCount === 1 ? '' : 's'} from the original template.
          </p>
        </Card>
      ) : null}

      {overview.pendingDecisions.length ? (
        <Card className="mb-4 border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="vf-section-label text-[var(--vf-warning-text)]">Pending Decision</p>
              <p className="mt-1 text-sm font-semibold">Review {overview.pendingDecisions[0]?.movementName} progression before the next block.</p>
            </div>
            <Badge color="warning">{overview.pendingDecisions.length} pending</Badge>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ProgramTimeline key={timeline.currentWeekIndex} timeline={timeline} status={program.status} currentSessionIndex={program.currentWeekIndex} />

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="vf-section-label">Current Anchors</h2>
                  <InfoHint label="What are anchors?">
                    Anchors are the training-max values used to calculate planned loads. When you accept a main-lift progression decision, the relevant anchor is updated for future sessions.
                  </InfoHint>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">Training max values used for load prescriptions.</p>
              </div>
              <Badge>{program.units}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {overview.anchors.map((anchor) => (
                <div key={anchor.movementId} className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
                  <p className="text-xs text-[var(--mantine-color-dimmed)]">{anchor.movementName}</p>
                  <p className="mt-1 text-lg font-bold">
                    {formatNumber(anchor.value)} <span className="text-xs text-[var(--mantine-color-dimmed)]">{anchor.units}</span>
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
                    {anchor.pendingDecision ? 'pending review' : anchor.lastAcceptedDecision ? 'last change saved' : 'training max'}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <h2 className="vf-section-label">Progression</h2>
              <InfoHint label="How progression works">
                Progression cards are recommendations generated from completed sessions. They stay pending until you accept, dismiss, or leave them for later; accepted anchor changes update future loads.
              </InfoHint>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">Reviewable recommendations from logged training.</p>
            {overview.pendingDecisions.length ? (
              <div className="mt-3 space-y-3">
                {overview.pendingDecisions.map((decision) => (
                  <div key={decision.id} className="rounded-lg border border-[var(--vf-warning-border)] bg-[var(--vf-surface-2)] p-3">
                    <p className="font-bold">{decision.movementName}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{formatRuleId(decision.ruleId)}</p>
                    <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">{decision.inputSummary}</p>
                    <p className="mt-1 text-xs font-semibold">{decision.recommendation}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button color="success" variant="light" disabled={mutation.isPending} onClick={() => mutation.mutate({ decisionId: decision.id, action: 'accepted' })}>
                        <Check size={14} />
                        Accept
                      </Button>
                      <Button variant="default" disabled={mutation.isPending} onClick={() => mutation.mutate({ decisionId: decision.id, action: 'pending' })}>
                        <Clock3 size={14} />
                        Later
                      </Button>
                      <Button color="danger" variant="light" disabled={mutation.isPending} onClick={() => mutation.mutate({ decisionId: decision.id, action: 'dismissed' })}>
                        <X size={14} />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">No pending recommendations.</p>
            )}
          </Card>

          <RecentProgramSessions overview={overview} />

          <AccessoryPlan overview={overview} />
        </div>
      </div>
    </Page>
  )
}

function formatRuleId(ruleId: string) {
  return ruleId.replaceAll('_', ' ')
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
            <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">{nextSession?.mainMovementName ?? 'Start a program to queue work.'}</p>
          </div>
          <Badge color={nextSession?.status === 'in_progress' ? 'warning' : nextSession?.status === 'completed' ? 'success' : 'action'}>
            {nextSession?.status.replaceAll('_', ' ') ?? 'planned'}
          </Badge>
        </div>
        <div className="mt-3 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-xs font-extrabold text-[var(--mantine-color-dimmed)]">Key work</p>
          <p className="mt-1 text-sm font-bold">{nextSession?.keyPrescription ?? 'No prescription'}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
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
            History
          </Button>
        </Link>
      </Card>
    </div>
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

function AccessoryPlan({ overview }: { overview: ProgramOverview }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="vf-section-label">Accessory plan</h2>
        <Badge>{overview.accessoryPlan.reduce((total, day) => total + day.slots.length, 0)} slots</Badge>
      </div>
      {overview.accessoryPlan.length ? (
        <div className="mt-3 space-y-3">
          {overview.accessoryPlan.map((day) => (
            <div key={day.sessionTitle} className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
              <p className="text-sm font-extrabold">{day.sessionTitle}</p>
              <div className="mt-2 space-y-1.5">
                {day.slots.length ? day.slots.map((slot) => (
                  <div key={slot.slotId} className="rounded-md bg-[var(--mantine-color-default)] px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-xs font-bold">{slot.movementName}</p>
                      {slot.isAdded ? <Badge color="warning" size="xs">Added</Badge> : null}
                    </div>
                    <p className="truncate text-[10px] text-[var(--mantine-color-dimmed)]">{slot.targetSummary}</p>
                    {slot.replacedMovementName ? (
                      <p className="mt-1 text-[10px] font-semibold text-[var(--vf-warning-text)]">Replaces {slot.replacedMovementName}</p>
                    ) : null}
                  </div>
                )) : (
                  <p className="text-xs text-[var(--mantine-color-dimmed)]">No accessory slots.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">No accessory plan available.</p>
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
                            <span className="font-semibold text-[var(--mantine-color-dimmed)]">{session.mainPrescription}</span>
                          </div>
                        </summary>
                        <div className="mt-2 grid gap-2 border-t border-[var(--mantine-color-default-border)] pt-2 sm:grid-cols-3">
                          <TimelineSessionDetail label="Main" value={`${session.mainMovement} · ${session.mainPrescription}`} />
                          <TimelineSessionDetail label="Variation" value={`${session.variationMovement} · ${session.variationPrescription}`} />
                          <TimelineSessionDetail label="Accessories" value={session.accessoryPrescription} />
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

function TimelineSessionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--mantine-color-default)] p-2">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--mantine-color-text)]">{value}</p>
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
