import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { recentHistoryQueryOptions } from '~/lib/query-options'
import { Chip, EmptyState, Page, PageHeader } from '~/components/ui'

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

  return (
    <Page>
      <PageHeader title="History" eyebrow="Recent sessions">
        A log of your completed workouts.
      </PageHeader>
      {data.length ? (
        <div className="grid gap-3">
          {data.map((session: any) => (
            <Link
              key={session.id}
              to="/sessions/$sessionId/summary"
              params={{ sessionId: session.id }}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--action)]"
            >
              <div>
                <p className="font-bold">{session.title}</p>
                <p className="text-sm text-[var(--muted)]">{session.programTitle}</p>
              </div>
              <Chip tone="success">
                {session.completedAt
                  ? new Date(session.completedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Done'}
              </Chip>
            </Link>
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
