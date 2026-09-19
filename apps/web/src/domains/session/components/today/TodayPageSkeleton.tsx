import { Skeleton, VisuallyHidden } from '@mantine/core'
import { Page, Panel } from '~/components'

/** Cold-load placeholder shaped like the planned Today screen to avoid layout shifts. */
export function TodayPageSkeleton() {
  return (
    <Page className="pb-24 md:pb-16">
      <div aria-busy="true" data-testid="today-page-loading">
        <VisuallyHidden>Loading today&apos;s workout</VisuallyHidden>

        <div className="mb-4" aria-hidden="true">
          <Skeleton height={10} width={120} radius="sm" />
          <Skeleton className="mt-2" height={28} width={104} radius="sm" />
          <Skeleton className="mt-2" height={12} width="min(22rem, 80%)" radius="sm" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
          <Panel className="space-y-3" p="md" data-testid="today-loading-hero">
            <div className="flex items-center justify-between gap-3" aria-hidden="true">
              <Skeleton height={22} width={126} radius="xl" />
              <Skeleton height={12} width={168} radius="sm" />
            </div>
            <Skeleton height={25} width="min(20rem, 75%)" radius="sm" aria-hidden="true" />

            <div data-testid="today-loading-workout">
              {[0, 1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between gap-3 py-3"
                  style={row ? { borderTop: '1px solid var(--vf-surface-3)' } : undefined}
                  aria-hidden="true"
                >
                  <Skeleton height={14} width={`min(${140 - row * 10}px, 45%)`} radius="sm" />
                  <Skeleton height={12} width={96} radius="sm" />
                </div>
              ))}
            </div>

            <Skeleton height={36} width={148} radius="md" aria-hidden="true" />
          </Panel>

          <div className="grid gap-4">
            <Panel p="md" aria-hidden="true">
              <Skeleton height={14} width={96} radius="sm" />
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3 py-2">
                  <Skeleton height={20} width={20} circle />
                  <Skeleton height={12} width="min(11rem, 60%)" radius="sm" />
                </div>
              ))}
            </Panel>
            <Panel p="md" className="hidden md:block" aria-hidden="true">
              <Skeleton height={14} width={110} radius="sm" />
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((tile) => (
                  <Skeleton key={tile} height={58} radius="md" />
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="mt-4">
          <LoadingDrawer testId="today-loading-recovery" titleWidth={102} summaryWidth={205} withDot />
        </div>
      </div>

      <div className="fixed right-4 bottom-[calc(var(--vf-mobile-bottom-offset)+1rem)] z-30 md:right-6 md:bottom-6">
        <Skeleton
          width={56}
          height={56}
          radius={9999}
          aria-hidden="true"
          data-testid="today-loading-action"
          style={{ boxShadow: 'var(--vf-shadow-card)' }}
        />
      </div>
    </Page>
  )
}

function LoadingDrawer({
  testId,
  titleWidth,
  summaryWidth,
  withDot = false,
}: {
  testId: string
  titleWidth: number
  summaryWidth: number
  withDot?: boolean
}) {
  return (
    <Panel p={0} data-testid={testId}>
      <div className="flex items-center gap-3" style={{ padding: '14px 16px' }} aria-hidden="true">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {withDot ? <Skeleton width={8} height={8} radius={9999} /> : null}
            <Skeleton height={13} width={titleWidth} radius="sm" />
          </div>
          <Skeleton className="mt-1" height={10} width={`min(${summaryWidth}px, 85%)`} radius="sm" />
        </div>
        <Skeleton height={16} width={16} radius="sm" />
      </div>
    </Panel>
  )
}
