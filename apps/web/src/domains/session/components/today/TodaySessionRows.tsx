import { Badge, UnstyledButton } from '@mantine/core'
import { useState } from 'react'
import { Caption, FormulaChip, Text } from '~/components'
import { cn } from '~/shared/lib/cn'
import { useExperienceMode } from '~/domains/account/components'
import { buildLoadTrace, definingSet } from '~/domains/program/lib/load-trace'
import { buildTodayLedgerRows } from '~/domains/session/lib/today-numbers'
import type { ProgramInstance } from '~/domains/program'
import type { PlannedSession } from '~/domains/session'

/** How many rows a phone shows before the disclosure; the comp shows three. */
const PHONE_ROW_LIMIT = 3

const NUMERIC = { fontVariantNumeric: 'tabular-nums' } as const

const roleTone: Record<string, string> = {
  main: 'action',
  variation: 'accent',
  accessory: 'warning',
}

/**
 * The session's movements, as the comp's inline table.
 *
 * Guided reads name + reason / sets / load. Full swaps in a role chip, the authored notation and —
 * when Show formulas is on — the expression behind the load, and makes each row selectable so the
 * trace inspector can follow it.
 *
 * The phone truncation is CSS, never a JS breakpoint: the reading mode is SSR-seeded and the first
 * paint has to be right.
 */
export function TodaySessionRows({
  session,
  program,
  reasonByStateKey,
  selectedSlotId,
  onSelectSlot,
}: {
  session: PlannedSession
  program?: ProgramInstance | null
  reasonByStateKey?: Record<string, string>
  selectedSlotId?: string | null
  /** Present only in Full, where the rows drive the trace panel. */
  onSelectSlot?: (slotId: string) => void
}) {
  const { mode, isFull, showFormulas } = useExperienceMode()
  // Phone shows three rows and a disclosure, per 02c/02d. Desktop always shows them all, so this
  // state only ever gates the `md:`-hidden rows — the first paint is identical on both.
  const [expanded, setExpanded] = useState(false)
  const rows = buildTodayLedgerRows(session, { mode, reasonByStateKey })
  const selectable = isFull && Boolean(onSelectSlot)
  const hidden = Math.max(0, rows.length - PHONE_ROW_LIMIT)

  return (
    <div
      data-testid="today-workout"
      role={selectable ? 'listbox' : undefined}
      aria-label={selectable ? 'Movements' : undefined}
    >
      {rows.map((row, index) => {
        const selected = selectable && row.slotId === selectedSlotId
        // By id, not index: the row builder maps 1:1 today, but a future filter would silently
        // pair each row with the wrong movement's formula.
        const movement = session.movements.find((slot) => slot.id === row.slotId)
        const set = isFull && showFormulas && movement ? definingSet(movement) : null
        const trace = set && movement ? buildLoadTrace({ set, movement, session, program: program ?? null }) : null

        return (
          // A plain div, not UnstyledButton: its unlayered `padding: 0` reset beats the layered
          // Tailwind utilities this grid depends on. Same selection contract as the old ledger.
          <div
            key={row.slotId}
            role={selectable ? 'option' : undefined}
            aria-selected={selectable ? selected : undefined}
            tabIndex={selectable ? 0 : undefined}
            onClick={selectable ? () => onSelectSlot?.(row.slotId) : undefined}
            onKeyDown={
              selectable
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectSlot?.(row.slotId)
                    }
                  }
                : undefined
            }
            className={[
              'w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 py-3 text-left',
              index >= PHONE_ROW_LIMIT && !expanded ? 'hidden md:grid' : 'grid',
              isFull
                ? 'md:grid-cols-[5.125rem_minmax(0,1fr)_minmax(0,1.3fr)_11.5rem] md:items-center'
                : 'md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_11.875rem] md:items-center',
              selectable ? 'cursor-pointer rounded-md px-2' : '',
            ].join(' ')}
            style={{
              ...(index ? { borderTop: '1px solid var(--vf-surface-3)' } : {}),
              ...(selected ? { backgroundColor: 'var(--vf-action-soft)' } : {}),
            }}
          >
            {isFull ? (
              <Badge
                color={roleTone[row.role] ?? 'neutral'}
                variant="light"
                className="col-span-2 row-start-1 justify-self-start md:col-span-1 md:col-start-1"
              >
                {row.role}
              </Badge>
            ) : null}

            {/* Phone stacks the chip above the name; desktop pulls the name back onto row 1. */}
            <div
              className={cn(
                'min-w-0 col-start-1 md:row-start-1',
                isFull ? 'row-start-2 md:col-start-2' : 'row-start-1',
              )}
            >
              <Text size="md" fw={600} lh={1.2} truncate>
                {row.movementName}
              </Text>
              {!isFull && row.reason ? <Caption mt={2} lh={1.35}>{row.reason}</Caption> : null}
            </div>

            <div
              className={cn(
                'flex min-w-0 flex-col gap-1 col-span-2 col-start-1 md:col-span-1',
                isFull ? 'row-start-3 md:col-start-3 md:row-start-1' : 'row-start-2 md:col-start-2 md:row-start-1',
              )}
            >
              <Text size="sm" tone="dimmed" lh={1.35} style={NUMERIC}>
                {row.prescriptionLabel}
              </Text>
              {trace ? (
                <span className="min-w-0 self-start">
                  <FormulaChip>{trace.expression}</FormulaChip>
                </span>
              ) : null}
              {isFull && row.historyLine ? <Caption>{row.historyLine}</Caption> : null}
            </div>

            {/* One load element, placed rather than duplicated: a second copy behind `md:hidden`
                would still be in the accessibility tree and would break any `.first()` locator. */}
            <Text
              size="md"
              fw={700}
              ta="right"
              className={cn(
                'col-start-2 self-baseline md:self-center',
                isFull ? 'row-start-2 md:col-start-4 md:row-start-1' : 'row-start-1 md:col-start-3',
              )}
              style={{ ...NUMERIC, whiteSpace: 'nowrap' }}
            >
              {row.loadsLabel}
            </Text>
          </div>
        )
      })}

      {hidden > 0 && !expanded ? (
        <UnstyledButton
          onClick={() => setExpanded(true)}
          className="w-full pt-3 text-left md:hidden"
          style={{ borderTop: '1px solid var(--vf-surface-3)' }}
        >
          <Caption component="span" tone="action" fw={700}>
            and {hidden} more
          </Caption>
        </UnstyledButton>
      ) : null}
    </div>
  )
}
