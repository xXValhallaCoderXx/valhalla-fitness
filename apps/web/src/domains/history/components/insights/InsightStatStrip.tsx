import type { ReactElement } from 'react'

/**
 * The hairline-divided strip of headline figures every Insights tab opens with.
 *
 * Takes rendered cells rather than data because each tab's cells differ in kind — some are
 * selectable, some are locked, and some are absent entirely when the programme has nothing to put
 * in them. A lift with no training max drops that cell rather than showing an em-dash.
 */
export function InsightStatStrip({ cells }: { cells: ReactElement[] }) {
  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
      {cells.map((cell, index) => (
        <div
          key={cell.key ?? index}
          className={index === cells.length - 1 ? 'min-w-0' : 'min-w-0 sm:border-r sm:pr-5'}
          style={{ borderColor: 'var(--mantine-color-default-border)' }}
        >
          {cell}
        </div>
      ))}
    </div>
  )
}
