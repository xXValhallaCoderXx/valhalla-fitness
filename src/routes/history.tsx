import { Badge, Card, Modal } from '@mantine/core'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronRight, Dumbbell, ListChecks, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { cn } from '~/lib/cn'
import { formatCompactDate, formatFullDate, formatRelativeTime } from '~/lib/dates'
import { recentHistoryQueryOptions, sessionQueryOptions } from '~/lib/query-options'
import type { RecentHistoryEntry, SetLog, WorkoutSession } from '~/types/training'
import { EmptyState, Page, PageHeader } from '~/components/ui'

export const Route = createFileRoute('/history')({
  loader: async ({ context }) => {
    if ((context as any).user) await context.queryClient.ensureQueryData(recentHistoryQueryOptions())
  },
  component: HistoryRoute,
})

function HistoryRoute() {
  const user = (Route.useRouteContext() as any).user
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to see training history">Completed sessions appear here.</EmptyState>
      </Page>
    )
  }
  return <AuthedHistory />
}

function AuthedHistory() {
  const { data } = useSuspenseQuery(recentHistoryQueryOptions())
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const selectedHistoryEntry = data.find((session) => session.id === selectedSessionId) ?? null
  const selectedSessionQuery = useQuery({
    ...sessionQueryOptions(selectedSessionId ?? ''),
    enabled: Boolean(selectedSessionId),
  })
  const completedCount = data.length
  const latestSession = data[0]
  const completedSetCount = data.reduce((total, session) => total + session.completedSetCount, 0)

  return (
    <Page>
      <PageHeader title="Training History" eyebrow="Recent sessions">
        Tap a completed workout to review its movements, sets, and top-set highlights.
      </PageHeader>

      <div className="mb-4 grid grid-cols-3 gap-2 md:gap-3">
        <Card className="p-3 text-center">
          <p className="text-lg font-extrabold md:text-xl">{completedCount}</p>
          <p className="text-[10px] text-[var(--mantine-color-dimmed)]">Sessions</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="truncate text-lg font-extrabold md:text-xl">
            {latestSession ? formatRelativeTime(latestSession.completedAt ?? latestSession.scheduledDate) : '—'}
          </p>
          <p className="text-[10px] text-[var(--mantine-color-dimmed)]">Latest</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-extrabold text-[var(--vf-success-text)] md:text-xl">{completedSetCount}</p>
          <p className="text-[10px] text-[var(--mantine-color-dimmed)]">Logged sets</p>
        </Card>
      </div>

      {data.length ? (
        <div className="grid gap-3">
          {data.map((session) => (
            <RecentWorkoutCard
              key={session.id}
              session={session}
              onOpen={() => setSelectedSessionId(session.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No completed sessions yet">
          Finish a workout and it will be listed here with movement history.
        </EmptyState>
      )}

      <WorkoutSummaryModal
        open={Boolean(selectedSessionId)}
        fallback={selectedHistoryEntry}
        session={selectedSessionQuery.data}
        isLoading={selectedSessionQuery.isPending}
        error={selectedSessionQuery.error}
        onClose={() => setSelectedSessionId(null)}
      />
    </Page>
  )
}

function RecentWorkoutCard({ session, onOpen }: { session: RecentHistoryEntry; onOpen: () => void }) {
  const date = session.completedAt ?? session.scheduledDate
  return (
    <button
      type="button"
      className="vf-card-hover rounded-[var(--mantine-radius-xl)] border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-4 text-left text-[var(--mantine-color-text)] shadow-[var(--vf-shadow-card)] transition hover:border-[var(--vf-action-border)]"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-primary-color-filled)]">
            {session.completedAt ? <Trophy size={16} /> : <Dumbbell size={16} />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-extrabold">{session.title}</p>
            <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">{session.programTitle ?? 'Training session'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {session.weekLabel ? <Badge>{session.weekLabel}</Badge> : null}
              {session.hardness ? <Badge color={session.hardness === 'Hard' ? 'danger' : 'neutral'}>{session.hardness}</Badge> : null}
              <Badge>{session.movementCount} movements</Badge>
              <Badge>{session.completedSetCount}/{session.plannedSetCount} sets</Badge>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-[11px] font-extrabold text-[var(--mantine-color-text)]">{formatCompactDate(date)}</p>
            <p className="text-[10px] font-semibold text-[var(--mantine-color-dimmed)]">{formatRelativeTime(date)}</p>
          </div>
          <ChevronRight size={16} className="text-[var(--mantine-color-dimmed)]" />
        </div>
      </div>
    </button>
  )
}

function WorkoutSummaryModal({
  open,
  fallback,
  session,
  isLoading,
  error,
  onClose,
}: {
  open: boolean
  fallback: RecentHistoryEntry | null
  session?: WorkoutSession
  isLoading: boolean
  error: unknown
  onClose: () => void
}) {
  const date = session?.completedAt ?? fallback?.completedAt ?? session?.scheduledDate ?? fallback?.scheduledDate
  const sets = session?.movements.flatMap((movement) => movement.sets) ?? []
  const completedSets = sets.filter((set) => set.completed)
  const topSets = completedSets.filter((set) => set.isTopSet || set.isAmrap)

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title="Workout summary"
      size="lg"
      classNames={{
        content: '!flex !max-h-[90dvh] !flex-col !overflow-hidden !border !border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        header: '!bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        title: 'text-lg font-bold !text-[var(--mantine-color-text)]',
        body: '!min-h-0 !flex-1 !overflow-hidden !text-[var(--mantine-color-text)]',
        close: '!text-[var(--mantine-color-dimmed)] hover:!bg-[var(--vf-surface-2)] hover:!text-[var(--mantine-color-text)]',
      }}
    >
      {isLoading ? (
        <HistoryModalStatus>Loading workout summary…</HistoryModalStatus>
      ) : error ? (
        <HistoryModalStatus tone="danger">{getApiErrorMessage(error, 'Unable to load workout summary')}</HistoryModalStatus>
      ) : session ? (
        <div className="grid max-h-[calc(90dvh-6rem)] min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] gap-4">
          <div className="rounded-2xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="vf-section-label">{session.programTitle}</p>
                <h2 className="mt-1 text-xl font-extrabold">{session.title}</h2>
                <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
                  {session.weekLabel} · {session.hardness} · {session.estimatedMinutes} min
                </p>
              </div>
              <div className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-3 py-2 text-right">
                <p className="text-sm font-extrabold">{formatFullDate(date)}</p>
                <p className="text-xs text-[var(--mantine-color-dimmed)]">{formatRelativeTime(date)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <SummaryMetric icon={<Dumbbell size={14} />} label="Movements" value={session.movements.length} />
            <SummaryMetric icon={<ListChecks size={14} />} label="Sets" value={`${completedSets.length}/${sets.length}`} />
            <SummaryMetric icon={<Trophy size={14} />} label="Top sets" value={topSets.length} />
          </div>

          {topSets.length ? (
            <div>
              <h3 className="vf-section-label mb-2">Highlights</h3>
              <div className="flex flex-wrap gap-1.5">
                {topSets.slice(0, 4).map((set) => (
                  <span key={set.id} className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs font-bold text-purple-300 md:text-purple-700">
                    {formatSetLog(set, session.units)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
            {session.movements.map((movement) => (
              <WorkoutMovementSummary key={movement.id} session={session} movement={movement} />
            ))}

            {session.notes ? (
              <div className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
                <h3 className="vf-section-label mb-1">Notes</h3>
                <p className="text-sm text-[var(--mantine-color-dimmed)]">{session.notes}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : fallback ? (
        <HistoryModalStatus>{fallback.title} is ready to review.</HistoryModalStatus>
      ) : null}
    </Modal>
  )
}

function WorkoutMovementSummary({ session, movement }: { session: WorkoutSession; movement: WorkoutSession['movements'][number] }) {
  const completedSets = movement.sets.filter((set) => set.completed)
  const displaySets = completedSets.length ? completedSets : movement.sets

  return (
    <div className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-extrabold">{movement.movementName}</p>
          <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
        </div>
        <Badge color={movement.role === 'main' ? 'action' : 'neutral'}>{movement.role}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {displaySets.map((set) => (
          <span
            key={set.id}
            className={cn(
              'rounded-lg border px-2 py-1 text-[11px] font-bold',
              set.isTopSet || set.isAmrap
                ? 'border-purple-500/30 bg-purple-500/10 text-purple-300 md:text-purple-700'
                : set.completed
                  ? 'border-[var(--vf-success-border)] bg-[var(--vf-success-soft)] text-[var(--vf-success-text)]'
                  : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)]',
            )}
          >
            {set.setIndex}: {formatSetLog(set, session.units)}
          </span>
        ))}
      </div>
    </div>
  )
}

function SummaryMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 text-center">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--mantine-color-default)] text-[var(--mantine-primary-color-filled)]">
        {icon}
      </div>
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[10px] text-[var(--mantine-color-dimmed)]">{label}</p>
    </div>
  )
}

function HistoryModalStatus({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <p className={cn('rounded-xl border p-3 text-sm', tone === 'danger' ? 'border-red-500/30 bg-red-500/10 text-red-200 md:text-red-700' : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]')}>
      {children}
    </p>
  )
}

function formatSetLog(set: SetLog, units: string) {
  const load = set.actualLoad ?? set.targetLoad
  const reps = set.actualReps ?? set.targetReps ?? (set.targetRepMin && set.targetRepMax ? `${set.targetRepMin}-${set.targetRepMax}` : set.targetRepMin)
  const loadText = load == null ? '—' : `${formatNumber(load)} ${units}`
  const repsText = reps == null ? '—' : `${reps}${set.isAmrap ? '+' : ''}`
  const rirText = typeof set.actualRir === 'number' ? ` @ RIR ${set.actualRir}` : ''
  return `${loadText} × ${repsText}${rirText}`
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}
