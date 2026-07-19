import { Badge, Modal } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Caption, Panel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { formatCompactDate, formatRelativeTime } from '~/shared/lib/dates'
import { movementHistoryQueryOptions } from '~/domains/history/queries'
import type { MovementHistoryEntry, MovementSlot } from '~/shared/types'
import { HistoryStatus } from './LiveSessionControls'
import { formatHistorySet } from './live-session-utils'

export function MovementHistoryModal({ open, movement, onClose }: { open: boolean; movement: MovementSlot; onClose: () => void }) {
  const movementId = movement.performedMovementId ?? movement.movementId
  const historyQuery = useQuery({
    ...movementHistoryQueryOptions(movementId),
    enabled: open,
  })
  const entries = historyQuery.data ?? []

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={`${movement.movementName} history`}
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
  const completedSets = entry.sets.filter((set) => set.completed)
  const displaySets = completedSets.length ? completedSets : entry.sets
  const date = entry.completedAt ?? entry.scheduledDate

  return (
    <Panel surface="inset" p="sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Text component="p" size="sm" fw={900} truncate>
            {entry.sessionTitle}
          </Text>
          <Caption component="p" mt={2}>
            {entry.programTitle ?? 'Training session'} · {entry.targetSummary}
          </Caption>
        </div>
        <Panel px="sm" py={4} className="text-right">
          <Caption component="span" display="block" fw={900} tt="uppercase">{formatCompactDate(date)}</Caption>
          <Caption component="span" display="block" fw={600}>{formatRelativeTime(date)}</Caption>
        </Panel>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {displaySets.map((set) => (
          <Badge
            key={set.id}
            color={set.isTopSet || set.isAmrap ? 'accent' : 'neutral'}
            variant="light"
          >
            {set.setIndex}: {formatHistorySet(set, entry.units ?? undefined)}
          </Badge>
        ))}
      </div>
    </Panel>
  )
}
