import { Skeleton, VisuallyHidden } from '@mantine/core'
import { Caption, Panel, SectionLabel, Text } from '~/components'

export function ProgramProgressSkeleton() {
  return (
    <Panel p="sm" aria-busy="true" data-testid="program-progress-loading">
      <VisuallyHidden>Loading program progress</VisuallyHidden>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Program</SectionLabel>
        <Skeleton width={72} height={20} radius="xl" aria-hidden="true" />
      </div>
      <Skeleton className="mt-3" height={6} radius="xl" aria-hidden="true" />
      <Skeleton className="mt-2" width="72%" height={10} radius="sm" aria-hidden="true" />
    </Panel>
  )
}

export function WeeklyVolumeSkeleton() {
  const barHeights = [30, 46, 38, 56, 44]
  return (
    <Panel p="sm" aria-busy="true" data-testid="weekly-volume-loading">
      <VisuallyHidden>Loading weekly volume</VisuallyHidden>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Weekly volume</SectionLabel>
        <Skeleton width={44} height={20} radius="xl" aria-hidden="true" />
      </div>
      <div className="mt-3 grid grid-cols-5 items-end gap-1" aria-hidden="true">
        {barHeights.map((height, index) => (
          <div key={index} className="min-w-0">
            <div className="flex h-16 items-end">
              <Skeleton width="100%" height={height} radius="sm" />
            </div>
            <Skeleton mt={4} mx="auto" width="70%" height={8} radius="sm" />
          </div>
        ))}
      </div>
    </Panel>
  )
}

export function RecoveryCheckSkeleton() {
  return (
    <Panel p={0} aria-busy="true" data-testid="recovery-check-loading">
      <VisuallyHidden>Loading recovery check</VisuallyHidden>
      <div className="flex items-center gap-3" style={{ padding: '14px 16px' }} aria-hidden="true">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton width={8} height={8} radius={9999} />
            <Skeleton width={102} height={13} radius="sm" />
          </div>
          <Skeleton className="mt-1" width="min(205px, 85%)" height={10} radius="sm" />
        </div>
        <Skeleton width={16} height={16} radius="sm" />
      </div>
    </Panel>
  )
}

export function UnavailablePanel({
  testId,
  title,
  message,
}: {
  testId: string
  title: string
  message: string
}) {
  return (
    <Panel p="sm" role="status" data-testid={testId}>
      <Text size="sm" fw={800}>{title}</Text>
      <Caption mt={2}>{message}</Caption>
    </Panel>
  )
}
