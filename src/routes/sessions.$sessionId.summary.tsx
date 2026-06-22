import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Badge, Button, Card } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Check, CheckCircle2, Clock3, Dumbbell, ListChecks, NotebookText, Trophy, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { sessionQueryOptions } from '~/lib/query-options'
import { resolveProgressionDecisionFn } from '~/server/api'
import type { MovementSlot, SessionSummary, SetLog, Unit } from '~/types/training'
import { Page, PageHeader } from '~/components/ui'

export const Route = createFileRoute('/sessions/$sessionId/summary')({
  loader: async ({ context, params }) => {
    if ((context as any).user) {
      await context.queryClient.ensureQueryData(sessionQueryOptions(params.sessionId))
    }
  },
  component: SummaryRoute,
})

function SummaryRoute() {
  const { sessionId } = Route.useParams()
  const { data: session } = useSuspenseQuery(sessionQueryOptions(sessionId))
  const queryClient = useQueryClient()
  const sets = session.movements.flatMap((movement) => movement.sets)
  const completedSets = sets.filter((set) => set.completed)
  const summary = queryClient.getQueryData<SessionSummary>(['summary', sessionId])
  const decisionMutation = useMutation({
    mutationFn: (data: { decisionId: string; action: 'accepted' | 'dismissed' | 'pending' }) =>
      resolveProgressionDecisionFn({ data }),
    onSuccess: async (_pendingDecisions, variables) => {
      if (variables.action !== 'pending') {
        queryClient.setQueryData<SessionSummary>(['summary', sessionId], (current) =>
          current
            ? {
                ...current,
                decisions: current.decisions.filter((decision) => decision.id !== variables.decisionId),
              }
            : current,
        )
      }
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
  const topSets = summary?.topSets.length ? summary.topSets : sets.filter((set) => set.isTopSet || set.isAmrap)
  const mainLift = session.movements.find((movement) => movement.role === 'main')
  const accessoryHighlights =
    summary?.accessoryOutcomes.length
      ? summary.accessoryOutcomes
      : session.movements
          .filter((movement) => movement.role === 'accessory')
          .map((movement) => `${movement.movementName}: ${movement.sets.filter((set) => set.completed).length}/${movement.sets.length} sets logged`)
  const decisionCount = summary?.decisions.length ?? 0

  return (
    <Page>
      <PageHeader
        title="Session summary"
        eyebrow={session.title}
        actions={
          <div className="flex items-center gap-2">
            <Badge>{session.estimatedMinutes} min</Badge>
            <Badge color="success">Completed</Badge>
          </div>
        }
      >
        {completedSets.length} of {sets.length} sets completed.
      </PageHeader>

      <Card className="mb-4 border-[var(--vf-success-border)] bg-[var(--vf-success-soft)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--vf-success-text)]" size={20} />
            <div>
              <h2 className="text-sm font-extrabold">All logged work saved</h2>
              <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">Review completed work and any progression actions before heading back to Today.</p>
            </div>
          </div>
          <Link to="/today">
            <Button className="w-full sm:w-auto">Done</Button>
          </Link>
        </div>
      </Card>

      <div className="mb-4 vf-stat-strip">
        <SummaryStat icon={<Dumbbell size={15} />} label="Movements" value={session.movements.length} />
        <SummaryStat icon={<ListChecks size={15} />} label="Sets" value={`${completedSets.length}/${sets.length}`} />
        <SummaryStat icon={<Trophy size={15} />} label="Top sets" value={topSets.length} />
        <SummaryStat icon={<ArrowRight size={15} />} label="Decisions" value={decisionCount} tone={decisionCount ? 'warning' : 'neutral'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {mainLift ? (
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className="vf-chip" data-active="true">Main lift</span>
                  <h2 className="mt-2 truncate text-lg font-extrabold">{mainLift.movementName}</h2>
                  <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">{mainLift.targetSummary}</p>
                </div>
                <Badge color={mainLift.sets.every((set) => set.completed) ? 'success' : 'warning'}>
                  {mainLift.sets.filter((set) => set.completed).length}/{mainLift.sets.length}
                </Badge>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="vf-inset p-3">
                  <p className="vf-section-label">Best today</p>
                  <p className="mt-1 text-sm font-extrabold">
                    {topSets[0] ? formatSetLog(topSets[0], session.units) : 'No top set logged'}
                  </p>
                </div>
                <div className="vf-inset p-3">
                  <p className="vf-section-label">Previous comparable</p>
                  <p className="mt-1 text-sm font-extrabold">{mainLift.previous?.label ?? 'No previous comparable'}</p>
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <h2 className="vf-section-label">Completed work</h2>
            <div className="mt-3 grid gap-2">
              {session.movements.map((movement) => (
                <MovementSummaryRow key={movement.id} movement={movement} units={session.units} />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <NotebookText size={14} className="text-[var(--mantine-color-dimmed)]" />
              <h2 className="vf-section-label">Notes</h2>
            </div>
            <p className="mt-2 text-sm leading-snug text-[var(--mantine-color-dimmed)]">
              {session.notes?.trim() || 'No session notes recorded.'}
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="vf-section-label">Accessory highlights</h2>
            {accessoryHighlights.length ? (
              <div className="mt-3 space-y-2">
                {accessoryHighlights.map((outcome) => (
                  <p key={outcome} className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 text-xs font-semibold text-[var(--mantine-color-dimmed)]">
                    {outcome}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">No accessory work logged in this session.</p>
            )}
          </Card>

          <Card>
            <h2 className="vf-section-label">Progression actions</h2>
            {summary?.decisions.length ? (
              <div className="mt-3 space-y-3">
                {summary.decisions.map((decision) => (
                  <div key={decision.id} className="rounded-lg border border-[var(--vf-warning-border)] bg-[var(--vf-surface-2)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{decision.movementName}</p>
                        <p className="mt-1 text-[11px] font-bold uppercase text-[var(--mantine-color-dimmed)]">{formatRuleId(decision.ruleId)}</p>
                        <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">{decision.inputSummary}</p>
                        <p className="mt-1 text-sm font-semibold">{decision.recommendation}</p>
                      </div>
                      <Badge color="warning">Pending</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button color="success" variant="light" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate({ decisionId: decision.id, action: 'accepted' })}>
                        <Check size={15} />
                        Accept
                      </Button>
                      <Button variant="default" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate({ decisionId: decision.id, action: 'pending' })}>
                        <Clock3 size={15} />
                        Later
                      </Button>
                      <Button color="danger" variant="light" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate({ decisionId: decision.id, action: 'dismissed' })}>
                        <X size={15} />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">No recommendation was generated yet.</p>
            )}
          </Card>

          <Link to="/today">
            <Button className="w-full">Finish review</Button>
          </Link>
        </div>
      </div>
    </Page>
  )
}

function SummaryStat({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  tone?: 'neutral' | 'warning'
}) {
  return (
    <div className="vf-stat">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--mantine-color-dimmed)]">{icon}</span>
        <span className={tone === 'warning' ? 'text-[var(--vf-warning-text)]' : 'text-[var(--mantine-color-text)]'}>
          <span className="vf-stat-value">{value}</span>
        </span>
      </div>
      <p className="vf-stat-label">{label}</p>
    </div>
  )
}

function MovementSummaryRow({
  movement,
  units,
}: {
  movement: MovementSlot
  units: Unit
}) {
  const completed = movement.sets.filter((set: SetLog) => set.completed)
  const topSet = movement.sets.find((set: SetLog) => set.isTopSet || set.isAmrap)
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{movement.movementName}</p>
          <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
        </div>
        <Badge color={movement.role === 'main' ? 'action' : 'neutral'}>{movement.role}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {movement.sets.map((set: SetLog) => (
          <span
            key={set.id}
            className={`rounded-md border px-2 py-1 text-[11px] font-bold ${
              set.completed
                ? 'border-[var(--vf-success-border)] bg-[var(--vf-success-soft)] text-[var(--vf-success-text)]'
                : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)]'
            }`}
          >
            {set.setIndex}: {formatSetLog(set, units)}
          </span>
        ))}
      </div>
      {topSet && completed.length ? (
        <p className="mt-2 text-[11px] font-semibold text-[var(--mantine-color-dimmed)]">Top target: {formatSetLog(topSet, units)}</p>
      ) : null}
    </div>
  )
}

function formatSetLog(set: SetLog, units: Unit | string) {
  const load = set.actualLoad ?? set.targetLoad
  const reps = set.actualReps ?? set.targetReps ?? (set.targetRepMin && set.targetRepMax ? `${set.targetRepMin}-${set.targetRepMax}` : set.targetRepMin)
  const loadText = load == null ? '-' : `${formatNumber(load)} ${units}`
  const repsText = reps == null ? '-' : `${reps}${set.isAmrap ? '+' : ''}`
  const rirText = typeof set.actualRir === 'number' ? ` @ RIR ${set.actualRir}` : ''
  return `${loadText} x ${repsText}${rirText}`
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function formatRuleId(ruleId: string) {
  return ruleId.replaceAll('_', ' ')
}
