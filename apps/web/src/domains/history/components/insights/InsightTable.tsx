import type { ReactNode } from 'react'
import { Caption } from '~/components'

/**
 * The tabular idiom shared by the session ledger and the movement table.
 *
 * A real `<table>`, deliberately: these are rows of comparable figures, the e2e reads them by
 * `role="row"` and `role="columnheader"`, and a CSS-grid stand-in gives neither. It scrolls inside
 * its own container so a wide table never pushes the page sideways.
 */
export function InsightTable({ children, minWidth }: { children: ReactNode; minWidth: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export function Th({
  children,
  align = 'left',
  hint,
  sort,
  onSort,
}: {
  children: ReactNode
  align?: 'left' | 'right'
  /** A qualifier under the label, for a column whose scope is narrower than its name. */
  hint?: string
  /** Present makes the header sortable; `aria-sort` follows it. */
  sort?: 'ascending' | 'descending' | 'none'
  onSort?: () => void
}) {
  const label = (
    <>
      <Caption fw={800}>{children}</Caption>
      {hint ? <Caption tone="dimmed">{hint}</Caption> : null}
    </>
  )
  return (
    <th
      className="px-2 pb-2"
      aria-sort={sort}
      style={{ textAlign: align, borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      {onSort ? (
        <button type="button" onClick={onSort} className="inline-flex flex-col" style={{ textAlign: align }}>
          {label}
        </button>
      ) : (
        label
      )}
    </th>
  )
}

export function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <td className="px-2 py-2.5 align-top" style={{ textAlign: align }}>
      {children}
    </td>
  )
}
