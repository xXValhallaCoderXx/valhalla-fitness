import { Badge } from '@mantine/core'
import { ChevronRight, Star, Trophy } from 'lucide-react'
import type { SessionLedgerRow } from '~/domains/history/lib/session-ledger'
import { useAccountClock } from '~/domains/account/components/AccountIdentityProvider'
import { useExperienceMode } from '~/domains/account/components'
import { AD_HOC_BADGE_LABEL } from '~/domains/session/lib/ad-hoc'
import { describeWorkoutDate } from '~/shared/lib/dates'
import { Caption, EquipmentModeBadge, Text } from '~/components'
import { intensityColor } from '~/domains/history/lib/insights'
import type { Unit } from '~/shared/types'

/**
 * The ledger.
 *
 * Full carries the columns a spreadsheet would; Guided drops week, tonnage-as-a-number, e1RM and
 * the PR flag and keeps what a lifter asks of a training log. Same rows either way.
 */
export function SessionLedgerTable({
  rows,
  units,
  onOpen,
}: {
  rows: SessionLedgerRow[]
  units: Unit | null
  onOpen: (sessionId: string) => void
}) {
  const { isFull } = useExperienceMode()

  if (!rows.length) {
    return <Text size="sm" tone="dimmed" className="py-4">No matching sessions.</Text>
  }

  return (
    <div className="overflow-x-auto">
      {/* Sized to fit beside the totals rail at the 1440 the design targets; narrower viewports
          scroll it inside this container rather than pushing the page sideways. */}
      <table className="w-full border-collapse" style={{ minWidth: isFull ? '46rem' : '34rem' }}>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Session</Th>
            {isFull ? <Th>Week</Th> : null}
            <Th align="right">Sets</Th>
            <Th align="right">{isFull ? 'Tonnage' : 'Weight moved'}</Th>
            {/* Only the main barbell lifts carry a per-session estimate, so the header says so. */}
            <Th align="right" hint={isFull ? 'main lifts only' : undefined}>
              {isFull ? 'Top e1RM' : 'Best lift'}
            </Th>
            <Th align="right">Time</Th>
            <Th align="right"><span className="sr-only">Open</span></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LedgerRow key={row.id} row={row} units={units} isFull={isFull} onOpen={onOpen} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LedgerRow({
  row,
  units,
  isFull,
  onOpen,
}: {
  row: SessionLedgerRow
  units: Unit | null
  isFull: boolean
  onOpen: (sessionId: string) => void
}) {
  const clock = useAccountClock()
  const date = describeWorkoutDate({
    scheduledDate: row.entry.scheduledDate,
    completedAt: row.entry.completedAt,
    timeZone: row.entry.timeZone ?? clock.timeZone,
    today: clock.today,
  })
  const color = intensityColor(row.entry.hardness)

  return (
    <tr
      className="cursor-pointer"
      onClick={() => onOpen(row.id)}
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <Td>
        <Text size="xs" fw={700}>{date.compactDate}</Text>
        <Caption>{date.relativeDate}</Caption>
        {/* An overnight workout finishes on a different day than it was scheduled for; the
            completion stamp is what tells those two dates apart. */}
        {date.completionLabel ? <Caption mt={1}>{date.completionLabel}</Caption> : null}
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <Text size="sm" fw={800} truncate>{row.title}</Text>
          {row.isPr ? <Trophy size={13} color="var(--vf-accent-text)" aria-label="Personal best" /> : null}
          {row.entry.isFavorite ? (
            <Star size={12} fill="var(--vf-accent-text)" color="var(--vf-accent-text)" aria-label="Favourite" />
          ) : null}
          {row.entry.isAdHoc ? <Badge color="accent" variant="light" size="xs">{AD_HOC_BADGE_LABEL}</Badge> : null}
          {row.entry.hardness ? <Badge color={color} variant="light" size="xs">{row.entry.hardness}</Badge> : null}
          <EquipmentModeBadge equipmentMode={row.entry.equipmentMode} className="shrink-0" />
        </div>
        <Caption mt={1} truncate>{row.entry.movementCount} movements</Caption>
      </Td>
      {isFull ? (
        <Td><Caption>{row.weekLabel ?? '—'}</Caption></Td>
      ) : null}
      <Td align="right">
        <Text size="xs" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {row.completedSetCount}
          {isFull ? <Caption component="span"> / {row.plannedSetCount}</Caption> : null}
        </Text>
      </Td>
      <Td align="right">
        <Text size="xs" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatTonnage(row.tonnage, units, isFull)}
        </Text>
      </Td>
      <Td align="right">
        {row.topE1rm === null ? (
          <Caption>—</Caption>
        ) : (
          <>
            <Text size="xs" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isFull ? row.topE1rm : row.topE1rmMovement}
            </Text>
            {isFull ? <Caption truncate>{row.topE1rmMovement}</Caption> : null}
          </>
        )}
      </Td>
      <Td align="right">
        {row.minutes === null ? (
          <Caption>—</Caption>
        ) : (
          <>
            <Text size="xs" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {row.minutesMeasured ? `${row.minutes}m` : `~${row.minutes}m`}
            </Text>
            {/* An estimate is never presented as a measurement. */}
            {!row.minutesMeasured ? <Caption>planned</Caption> : null}
          </>
        )}
      </Td>
      <Td align="right">
        {/* The row is clickable for convenience, but the real control is this button — a `tr` with
            an onClick is unreachable by keyboard and has no role to announce. */}
        <button
          type="button"
          aria-label={`Open ${row.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onOpen(row.id)
          }}
          style={{ appearance: 'none', background: 'none', cursor: 'pointer', lineHeight: 0 }}
        >
          <ChevronRight size={15} color="var(--mantine-color-dimmed)" />
        </button>
      </Td>
    </tr>
  )
}

/** Tonnage in tonnes reads better than five digits of kilos, but Full keeps the exact figure. */
function formatTonnage(tonnage: number, units: Unit | null, isFull: boolean): string {
  if (!tonnage) return '—'
  if (isFull && tonnage < 10000) return `${tonnage} ${units ?? ''}`.trim()
  return `${(tonnage / 1000).toFixed(1)} t`
}

function Th({
  children,
  align = 'left',
  hint,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  hint?: string
}) {
  return (
    <th
      className="px-2 pb-2"
      style={{ textAlign: align, borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Caption fw={800}>{children}</Caption>
      {hint ? <Caption tone="dimmed">{hint}</Caption> : null}
    </th>
  )
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td className="px-2 py-2.5 align-top" style={{ textAlign: align }}>
      {children}
    </td>
  )
}
