import { Badge, Box } from '@mantine/core'
import { Caption, Text } from '~/components'
import { sessionCompletion } from '~/domains/session/lib/session-cache'
import type { WorkoutSession } from '~/shared/types'

export function SyncPill({ state }: { state?: string }) {
  if (state !== 'saving' && state !== 'syncFailed') return null

  const label = state === 'syncFailed' ? 'Sync failed' : 'Saving'
  const tone = state === 'syncFailed' ? 'danger' : 'warning'

  return <Badge color={tone}>{label}</Badge>
}

export function SessionProgress({ session, compact = false }: { session: WorkoutSession; compact?: boolean }) {
  const progress = sessionCompletion(session)
  const completedMovements = session.movements.filter((movement) => movement.sets.every((set) => set.completed)).length
  const progressLabel = compact
    ? `${progress.completed}/${progress.total} sets · ${completedMovements}/${session.movements.length} movements`
    : `${progress.completed} of ${progress.total} sets`

  return (
    <div className="space-y-1.5">
      <Caption component="div" className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate">{progressLabel}</span>
        <Text component="span" size="xs" fw={700}>
          {progress.percent}%
        </Text>
      </Caption>
      <Box className="h-2 overflow-hidden rounded-full" bg="var(--vf-surface-2)">
        <Box
          className="h-full rounded-full"
          bg="var(--mantine-primary-color-filled)"
          style={{ width: `${progress.percent}%` }}
        />
      </Box>
    </div>
  )
}
