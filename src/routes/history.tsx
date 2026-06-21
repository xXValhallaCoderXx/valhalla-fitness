import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
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

  return (
    <Page>
      <PageHeader title="History" eyebrow="Recent sessions">
        Recent, Movements, Bests, and Volume views share the same logged session data.
      </PageHeader>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {['Recent', 'Movements', 'Bests', 'Volume'].map((tab, index) => (
          <Chip key={tab} tone={index === 0 ? 'action' : 'neutral'}>
            {tab}
          </Chip>
        ))}
      </div>
      {data.length ? (
        <div className="grid gap-3">
          {data.map((session: any) => (
            <Card key={session.id}>
              <div className="flex items-center justify-between gap-3">
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
