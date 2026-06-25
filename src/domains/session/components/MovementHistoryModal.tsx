import { Modal } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { formatCompactDate, formatRelativeTime } from '~/shared/lib/dates'
import { movementHistoryQueryOptions } from '~/domains/history/queries'
import { cn } from '~/shared/lib/cn'
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
      classNames={{
        content: '!border !border-[var(--mantine-color-default-border)] !bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        header: '!bg-[var(--mantine-color-default)] !text-[var(--mantine-color-text)]',
        title: 'text-lg font-bold !text-[var(--mantine-color-text)]',
        body: '!text-[var(--mantine-color-text)]',
        close: '!text-[var(--mantine-color-dimmed)] hover:!bg-[var(--vf-surface-2)] hover:!text-[var(--mantine-color-text)]',
      }}
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--mantine-color-dimmed)]">
          Recent completed logs for this movement, including sessions from any program.
        </p>

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
    <div className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{entry.sessionTitle}</p>
          <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">
            {entry.programTitle ?? 'Training session'} · {entry.targetSummary}
          </p>
        </div>
        <span className="rounded-xl border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2 py-1 text-right">
          <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{formatCompactDate(date)}</span>
          <span className="block text-[10px] font-semibold text-[var(--mantine-color-dimmed)]">{formatRelativeTime(date)}</span>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {displaySets.map((set) => (
          <span
            key={set.id}
            className={cn(
              'rounded-lg border px-2 py-1 text-[11px] font-bold',
              set.isTopSet || set.isAmrap
                ? 'border-[var(--vf-accent-border)] bg-[var(--vf-accent-soft)] text-[var(--mantine-color-accent-filled)]'
                : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-text)]',
            )}
          >
            {set.setIndex}: {formatHistorySet(set, entry.units ?? undefined)}
          </span>
        ))}
      </div>
    </div>
  )
}
