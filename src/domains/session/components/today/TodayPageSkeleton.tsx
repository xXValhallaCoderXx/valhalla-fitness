import { Skeleton, VisuallyHidden } from '@mantine/core'
import { Page, Panel } from '~/components'

/** Cold-load placeholder shaped like the planned Today screen to avoid layout shifts. */
export function TodayPageSkeleton() {
  return (
    <Page className="max-w-3xl pb-24 md:pb-16">
      <div aria-busy="true" data-testid="today-page-loading">
        <VisuallyHidden>Loading today&apos;s workout</VisuallyHidden>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <Panel className="space-y-4" p="md" data-testid="today-loading-hero">
            <div className="min-w-0">
              <div className="flex items-center gap-2" aria-hidden="true">
                <Skeleton height={22} width={56} radius="xl" />
                <Skeleton height={22} width={62} radius="xl" />
                <Skeleton height={22} width={86} radius="xl" />
              </div>
              <Skeleton className="mt-3" height={25} width="min(20rem, 75%)" radius="sm" aria-hidden="true" />
              <Skeleton className="mt-2" height={12} width={150} radius="sm" aria-hidden="true" />
            </div>

            <Panel surface="inset" p="sm">
              <div className="flex items-center justify-between gap-3" aria-hidden="true">
                <Skeleton height={22} width={82} radius="xl" />
                <Skeleton height={16} width={16} radius="sm" />
              </div>
              <Skeleton className="mt-3" height={20} width="min(18rem, 68%)" radius="sm" aria-hidden="true" />
              <Skeleton className="mt-2" height={12} width={120} radius="sm" aria-hidden="true" />
              <Skeleton className="mt-2" height={10} width="min(15rem, 58%)" radius="sm" aria-hidden="true" />
            </Panel>

            <Skeleton height={36} radius="md" aria-hidden="true" />
          </Panel>

          <LoadingDrawer testId="today-loading-workout" titleWidth={112} summaryWidth={176} />
          <LoadingDrawer testId="today-loading-recovery" titleWidth={102} summaryWidth={205} withDot />
        </div>
      </div>

      <div className="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] z-30 md:right-6 md:bottom-6">
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
