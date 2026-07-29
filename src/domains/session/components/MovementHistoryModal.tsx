import { Badge, Modal } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Caption, Panel, Text } from '~/components'
import {
  useAccountClock,
  useRequiredAccountId,
} from '~/domains/account/components/AccountIdentityProvider'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { describeWorkoutDate } from '~/shared/lib/dates'
import { describeLift } from '~/shared/lib/set-notation'
import { movementHistoryQueryOptions } from '~/domains/history/queries'
import type { MovementHistoryEntry } from '~/domains/history'
import type { MovementSlot } from '~/domains/session'
import { HistoryStatus } from './LiveSessionControls'

export function MovementHistoryModal({ open, movement, onClose }: { open: boolean; movement: MovementSlot; onClose: () => void }) {
  const userId = useRequiredAccountId()
  const movementId = movement.performedMovementId ?? movement.movementId
  const historyQuery = useQuery({
    ...movementHistoryQueryOptions(userId, movementId),
    enabled: open,
  })
  const entries = historyQuery.data ?? []
  const movementName = movement.performedMovementName ?? movement.movementName

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={`${movementName} history`}
      size="lg"
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        header: {
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        title: {
          color: 'var(--mantine-color-text)',
          fontSize: 'var(--mantine-font-size-lg)',
          fontWeight: 700,
        },
        body: {
          color: 'var(--mantine-color-text)',
        },
        close: {
          color: 'var(--mantine-color-dimmed)',
        },
      }}
    >
      <div className="space-y-3">
        <Text component="p" size="sm" tone="dimmed">
          Recent completed logs for this movement, including sessions from any program.
        </Text>

        {historyQuery.isPending ? (
          <HistoryStatus>Loading recent sets…</HistoryStatus>
        ) : historyQuery.isError ? (
          <HistoryStatus tone="danger">{getApiErrorMessage(historyQuery.error, 'Unable to load movement history')}</HistoryStatus>
        ) : entries.length ? (
          <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {entries.map((entry) => (
              <MovementHistoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <HistoryStatus>No completed sets for this movement yet.</HistoryStatus>
        )}
      </div>
    </Modal>
  )
}

function MovementHistoryCard({ entry }: { entry: MovementHistoryEntry }) {
  const clock = useAccountClock()
  const date = describeWorkoutDate({
    scheduledDate: entry.scheduledDate,
    completedAt: entry.completedAt,
    timeZone: entry.timeZone ?? clock.timeZone,
    today: clock.today,
  })

  return (
    <Panel surface="inset" p="sm" data-testid="movement-history-entry">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Text component="p" size="sm" fw={900} truncate>
            {entry.sessionTitle}
          </Text>
          <Caption component="p" mt={2}>
            {entry.programTitle ?? 'Training session'} · {entry.targetSummary}
          </Caption>
          {date.completionLabel ? (
            <Caption component="p" mt={2}>{date.completionLabel}</Caption>
          ) : null}
        </div>
        <Panel px="sm" py={4} className="text-right">
          <Caption component="span" display="block" fw={900} tt="uppercase">{date.compactDate}</Caption>
          <Caption component="span" display="block" fw={600}>{date.relativeDate}</Caption>
        </Panel>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {entry.sets.map((set) => (
          <Badge
            key={set.id}
            color={set.isTopSet || set.isAmrap ? 'accent' : 'neutral'}
            variant="light"
          >
            {set.setIndex}: {describeLift({
              load: set.actualLoad,
              reps: set.actualReps,
              rir: set.actualRir,
              units: entry.units,
              amrap: set.isAmrap,
            }).compact}
          </Badge>
        ))}
      </div>
    </Panel>
  )
}
