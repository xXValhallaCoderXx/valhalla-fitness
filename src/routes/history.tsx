import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Dumbbell, Trophy } from 'lucide-react'
import { recentHistoryQueryOptions } from '~/lib/query-options'
import { Card, Chip, EmptyState, Page, PageHeader } from '~/components/ui'

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
  const completedCount = data.length
  const latestSession = data[0]

  return (
    <Page>
      <PageHeader title="Training History" eyebrow="Recent sessions">
        Recent, Movements, Bests, and Volume views share the same logged session data.
      </PageHeader>

      <div className="mb-4 flex w-fit gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-card)]">
        {['Recent', 'Movements', 'Bests', 'Volume'].map((tab, index) => (
          <button
            key={tab}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
              index === 0 ? 'bg-[var(--action)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 md:gap-3">
        <Card className="p-3 text-center">
          <p className="text-lg font-extrabold md:text-xl">{completedCount}</p>
          <p className="text-[10px] text-[var(--muted)]">Sessions</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-extrabold md:text-xl">{latestSession ? 'Done' : '—'}</p>
          <p className="text-[10px] text-[var(--muted)]">Latest</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-extrabold text-[var(--success-text)] md:text-xl">Synced</p>
          <p className="text-[10px] text-[var(--muted)]">Status</p>
        </Card>
      </div>

      {data.length ? (
        <div className="grid gap-3">
          {data.map((session: any) => (
            <Card key={session.id} className="vf-card-hover">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--action)]">
                    {session.completedAt ? <Trophy size={15} /> : <Dumbbell size={15} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{session.title}</p>
                    <p className="text-xs text-[var(--muted)]">{session.programTitle}</p>
                  </div>
                </div>
                <Chip tone="success">
                  {session.completedAt
                    ? new Date(session.completedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Done'}
                </Chip>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No completed sessions yet">
          Finish a workout and it will be listed here with movement history.
        </EmptyState>
      )}
    </Page>
  )
}
