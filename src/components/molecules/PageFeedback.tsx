import { Button, Card, Skeleton } from '@mantine/core'
import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { Page } from './Page'

export function PageSkeleton({
  compact = false,
  actions,
}: {
  compact?: boolean
  actions?: ReactNode
}) {
  return (
    <Page>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Skeleton height={10} width={86} radius="sm" />
          <Skeleton className="mt-3" height={30} width="min(22rem, 80%)" radius="sm" />
          <Skeleton className="mt-3" height={12} width="min(34rem, 100%)" radius="sm" />
        </div>
        {actions ?? <Skeleton height={32} width={110} radius="md" />}
      </div>

      <div className="vf-stat-strip mb-4">
        <Skeleton height={78} radius="md" />
        <Skeleton height={78} radius="md" />
        <Skeleton height={78} radius="md" />
        <Skeleton height={78} radius="md" />
      </div>

      <div className={compact ? 'grid gap-4' : 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]'}>
        <div className="space-y-3">
          <Skeleton height={compact ? 110 : 170} radius="lg" />
          <Skeleton height={compact ? 110 : 150} radius="lg" />
        </div>
        {!compact ? (
          <div className="space-y-3">
            <Skeleton height={120} radius="lg" />
            <Skeleton height={150} radius="lg" />
          </div>
        ) : null}
      </div>
    </Page>
  )
}

export function PageLoadError({
  error,
  title = 'The screen could not load.',
  onRetry,
}: {
  error: unknown
  title?: string
  onRetry?: () => void
}) {
  return (
    <Page>
      <Card className="mx-auto max-w-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-[var(--vf-danger-text)]" size={20} />
          <div className="min-w-0">
            <p className="vf-section-label text-[var(--vf-danger-text)]">Load failed</p>
            <h1 className="mt-2 text-lg font-bold">{title}</h1>
            <p className="mt-2 text-sm text-[var(--mantine-color-dimmed)]">
              {getApiErrorMessage(error, title)}
            </p>
            {onRetry ? (
              <Button className="mt-4" variant="light" color="danger" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </Page>
  )
}
