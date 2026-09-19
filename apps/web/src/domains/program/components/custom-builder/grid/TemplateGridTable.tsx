import type { SessionHardness } from '@sheetless/domain/shared/types'
import type { TemplateGrid, TemplateGridCellValue, TemplateGridRow } from '~/domains/program/lib/template-grid'
import { templateCellAddress, templateRowStateLabel } from '~/domains/program/lib/template-grid'
import { Caption, Text } from '~/components'

/**
 * Slots down, weeks across — the definition laid out.
 *
 * The table scrolls inside its own container: `plus_set_wave` generates eighteen weeks, and a grid
 * that made the page scroll sideways would take the rest of the app with it.
 */
export function TemplateGridTable({
  grid,
  showFormulas,
  cellValue,
  selectedAddress,
  onSelect,
}: {
  grid: TemplateGrid
  showFormulas: boolean
  cellValue: (address: string) => TemplateGridCellValue
  selectedAddress: string | null
  onSelect: (address: string) => void
}) {
  const groups = groupRowsBySession(grid.rows)
  return (
    <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
      <table className="w-full border-collapse" style={{ minWidth: `${14 + grid.columns.length * 9}rem` }}>
        <thead>
          <tr>
            <th
              className="sticky left-0 z-10 px-2 py-2 text-left"
              style={{
                backgroundColor: 'var(--vf-surface-2)',
                borderBottom: '1px solid var(--mantine-color-default-border)',
                minWidth: '13rem',
              }}
            >
              <Caption fw={800}>Slot · rule</Caption>
            </th>
            {grid.columns.map((column) => (
              <th
                key={column.weekIndex}
                className="px-2 py-2 text-left"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)', minWidth: '8rem' }}
              >
                <Caption fw={800}>{column.label}</Caption>
                <div className="flex items-center gap-1">
                  <Caption tone="dimmed" truncate>{column.phaseLabel}</Caption>
                  <Caption fw={700} tone={hardnessTone(column.hardness)}>· {column.hardness}</Caption>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.sessionId}>
            {/* One strip per training day. `sessionTitle` has always been on the row and never
                read — without it nine slots read as one undifferentiated list. */}
            <tr>
              <th
                scope="colgroup"
                colSpan={grid.columns.length + 1}
                className="px-2 py-1.5 text-left"
                style={{
                  backgroundColor: 'var(--vf-surface-2)',
                  borderTop: '1px solid var(--mantine-color-default-border)',
                }}
              >
                {/* Sticky, because the strip spans every week: scrolled right, a title pinned to
                    column zero would slide out of the viewport and leave a blank band. */}
                <span className="sticky left-0 flex items-baseline gap-2" style={{ width: 'fit-content' }}>
                  <Caption fw={800}>{group.title}</Caption>
                  <Caption tone="dimmed">
                    {group.rows.length} slot{group.rows.length === 1 ? '' : 's'}
                  </Caption>
                </span>
              </th>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 px-2 py-2 text-left align-top"
                  style={{
                    backgroundColor: 'var(--vf-surface-2)',
                    borderTop: '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <Text size="xs" fw={700} truncate>{row.movementName}</Text>
                    <RoleChip role={row.role} />
                  </span>
                  <span className="mt-0.5 flex items-baseline gap-1.5">
                    <Caption className="font-mono" truncate>{row.progressionRuleId ?? 'no rule'}</Caption>
                    {templateRowStateLabel(grid, row) ? (
                      <Caption className="font-mono" tone="dimmed">{templateRowStateLabel(grid, row)}</Caption>
                    ) : null}
                  </span>
                </th>
                {grid.columns.map((column) => {
                  const address = templateCellAddress(row.sessionId, row.slotId, column.weekIndex)
                  const selected = address === selectedAddress
                  const value = cellValue(address)
                  const empty = value.target === null
                  return (
                    <td
                      key={address}
                      className="px-0 py-0 align-top"
                      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={address}
                        disabled={empty}
                        onClick={() => onSelect(address)}
                        className="w-full px-2 py-2 text-left"
                        style={{
                          appearance: 'none',
                          background: selected ? 'var(--vf-action-soft)' : 'none',
                          cursor: empty ? 'default' : 'pointer',
                        }}
                      >
                        {empty ? (
                          /* Not blank — this week declares nothing for this slot. */
                          <Caption tone="dimmed">—</Caption>
                        ) : (
                          <>
                            <Caption truncate>{value.target}</Caption>
                            {showFormulas ? (
                              <Caption className="font-mono" tone="dimmed" truncate>{value.formula}</Caption>
                            ) : null}
                            <Text
                              mt={1}
                              size="xs"
                              fw={800}
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {value.value ?? '—'}
                            </Text>
                          </>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function RoleChip({ role }: { role: TemplateGridRow['role'] }) {
  return (
    <span
      className="shrink-0 rounded px-1"
      style={{
        backgroundColor: role === 'main' ? 'var(--vf-action-soft)' : 'var(--vf-surface-inset)',
        border: `1px solid ${role === 'main' ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
      }}
    >
      <Caption fw={800} tone={role === 'main' ? 'action' : 'dimmed'}>{role}</Caption>
    </span>
  )
}

function hardnessTone(hardness: SessionHardness) {
  if (hardness === 'Hard') return 'warning' as const
  // Not success: a deload is a different kind of week, not a good one.
  if (hardness === 'Deload') return 'action' as const
  return 'dimmed' as const
}

/** Consecutive rows share a session — the grid is already ordered by it. */
function groupRowsBySession(rows: TemplateGridRow[]) {
  const groups: Array<{ sessionId: string; title: string; rows: TemplateGridRow[] }> = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.sessionId === row.sessionId) last.rows.push(row)
    else groups.push({ sessionId: row.sessionId, title: row.sessionTitle, rows: [row] })
  }
  return groups
}
