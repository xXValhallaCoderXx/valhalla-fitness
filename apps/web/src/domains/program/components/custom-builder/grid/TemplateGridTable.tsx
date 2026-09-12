import type { TemplateGrid } from '~/domains/program/lib/template-grid'
import { templateCellAddress } from '~/domains/program/lib/template-grid'
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
  /** The line rendered inside a cell — the resolved load, or its expression. */
  cellValue: (address: string) => { primary: string; secondary: string | null }
  selectedAddress: string | null
  onSelect: (address: string) => void
}) {
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
                <Caption tone="dimmed">{column.hardness}</Caption>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.key}>
              <th
                scope="row"
                className="sticky left-0 z-10 px-2 py-2 text-left align-top"
                style={{
                  backgroundColor: 'var(--vf-surface-2)',
                  borderTop: '1px solid var(--mantine-color-default-border)',
                }}
              >
                <Text size="xs" fw={700} truncate>{row.movementName}</Text>
                <Caption truncate>
                  {row.role}
                  {row.progressionRuleId ? ` · ${row.progressionRuleId}` : ''}
                </Caption>
              </th>
              {grid.columns.map((column) => {
                const address = templateCellAddress(row.sessionId, row.slotId, column.weekIndex)
                const cell = grid.cells[address]
                const selected = address === selectedAddress
                const value = cellValue(address)
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
                      disabled={!cell?.prescription}
                      onClick={() => onSelect(address)}
                      className="w-full px-2 py-2 text-left"
                      style={{
                        appearance: 'none',
                        background: selected ? 'var(--vf-action-soft)' : 'none',
                        cursor: cell?.prescription ? 'pointer' : 'default',
                      }}
                    >
                      {cell?.prescription ? (
                        <>
                          <Text
                            size="xs"
                            fw={700}
                            className={showFormulas ? 'font-mono' : undefined}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {value.primary}
                          </Text>
                          {value.secondary ? <Caption mt={1} truncate>{value.secondary}</Caption> : null}
                        </>
                      ) : (
                        /* Not blank — this week declares nothing for this slot. */
                        <Caption tone="dimmed">—</Caption>
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
