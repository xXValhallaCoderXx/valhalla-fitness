import { Badge, Button, Card, Tooltip } from '@mantine/core'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createFileRoute } from '@tanstack/react-router'
import { Check, Clock3, Info, X } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { activeProgramQueryOptions, todayQueryOptions } from '~/lib/query-options'
import { buildProgramTimeline, type ProgramTimelineModel } from '~/lib/program-timeline'
import { templateCatalog } from '~/lib/templates'
import { resolveProgressionDecisionFn } from '~/server/api'
import { EmptyState, Page, PageHeader } from '~/components/ui'

export const Route = createFileRoute('/program')({
  loader: async ({ context }) => {
    if ((context as any).user) {
      await Promise.all([
        context.queryClient.ensureQueryData(activeProgramQueryOptions()),
        context.queryClient.ensureQueryData(todayQueryOptions()),
      ])
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
  const { data: program } = useSuspenseQuery(activeProgramQueryOptions())
  const { data: today } = useSuspenseQuery(todayQueryOptions())
  const mutation = useMutation({
    mutationFn: (data: { decisionId: string; action: 'accepted' | 'dismissed' | 'pending' }) =>
      resolveProgressionDecisionFn({ data }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
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

  if (!program) {
    return (
      <Page>
        <EmptyState title="No active program">Start a template to see its timeline and anchors here.</EmptyState>
      </Page>
    )
  }

  const timeline = buildProgramTimeline(program)
  const template = templateCatalog.find((item) => item.id === program.templateId)
  const programmeDetail = getProgrammeDetail(program.templateId)

  return (
    <Page>
      <PageHeader
        title={program.title}
        eyebrow="Program"
        actions={<Badge color="action">Week {timeline.currentWeekIndex + 1} of {timeline.totalWeeks}</Badge>}
      >
        <span className="block">{template?.description ?? 'Structured training plan with reviewable progression.'}</span>
        <span className="mt-1 block text-[11px] font-semibold text-[var(--mantine-color-dimmed)] md:text-xs">
          Current position: week {timeline.currentWeekIndex + 1} · session {timeline.currentSessionInWeek + 1} of {timeline.daysPerWeek}
        </span>
      </PageHeader>

      <Card className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="vf-section-label">Programme overview</h2>
              <InfoHint label="About this programme">
                This is the active template driving your planned sessions, weekly structure, anchor calculations, and progression recommendations.
              </InfoHint>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--mantine-color-dimmed)]">{programmeDetail}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 md:max-w-xs md:justify-end">
            {template ? <Badge color={template.sourceLabel === 'Bromley' ? 'warning' : 'action'}>{template.sourceLabel}</Badge> : null}
            {template ? <Badge>{template.daysPerWeek} days/wk</Badge> : null}
            <Badge>{timeline.totalWeeks} weeks</Badge>
            {template ? <Badge color="action" className="normal-case">{template.progressionLabel}</Badge> : null}
            {template ? <Badge>{template.complexity}</Badge> : null}
          </div>
        </div>
      </Card>

      {today.pendingDecisions.length ? (
        <Card className="mb-4 !border-[var(--vf-warning-border)] !bg-[var(--vf-warning-soft)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="vf-section-label text-[var(--vf-warning-text)]">Pending Decision</p>
              <p className="mt-1 text-sm font-semibold">Review {today.pendingDecisions[0]?.movementName} progression before the next block.</p>
            </div>
            <Badge color="warning">{today.pendingDecisions.length} pending</Badge>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ProgramTimeline key={timeline.currentWeekIndex} timeline={timeline} status={program.status} currentSessionIndex={program.currentWeekIndex} />

        <div className="space-y-4">
          <Card>
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
              {program.anchors.map((anchor) => (
                <div key={anchor.movementId} className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
                  <p className="text-xs text-[var(--mantine-color-dimmed)]">{anchor.movementId.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-lg font-bold">
                    {anchor.value} <span className="text-xs text-[var(--mantine-color-dimmed)]">{program.units}</span>
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
                    {anchor.anchorType.replaceAll('_', ' ')}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <h2 className="vf-section-label">Progression</h2>
              <InfoHint label="How progression works">
                Progression cards are recommendations generated from completed sessions. They stay pending until you accept, dismiss, or leave them for later; accepted anchor changes update future loads.
              </InfoHint>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">Reviewable recommendations from logged training.</p>
            {today.pendingDecisions.length ? (
              <div className="mt-3 space-y-3">
                {today.pendingDecisions.map((decision) => (
                  <div key={decision.id} className="rounded-xl border border-[var(--vf-warning-border)] bg-[var(--vf-surface-2)] p-3">
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
        </div>
      </div>
    </Page>
  )
}

function formatRuleId(ruleId: string) {
  return ruleId.replaceAll('_', ' ')
}

function getProgrammeDetail(templateId: string) {
  if (templateId === 'healthy-531-fsl') {
    return 'Healthy 5/3/1 FSL uses training-max anchors to calculate weekly percentage work, plus First Set Last back-off sets and accessories. Logged top-set reps and RIR feed reviewable training-max decisions.'
  }
  if (templateId === 'bromley-bullmastiff') {
    return 'Bullmastiff runs an 18-week base-to-peak structure built from three-week plus-set waves. It does not prescribe a fixed standalone deload week in the app fixture; recovery comes from resetting the starting weight and rep range at the start of each new wave.'
  }
  return 'This programme controls your planned sessions, load calculations, and reviewable progression recommendations.'
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
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="vf-section-label">Timeline — Programme</h2>
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
                className={`flex-1 rounded-xl border p-3 ${
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
                        className={`rounded-lg border bg-[var(--vf-surface-2)] px-3 py-2 text-xs ${
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
