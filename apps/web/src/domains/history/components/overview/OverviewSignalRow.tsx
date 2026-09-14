import type { ReactNode } from 'react'

/**
 * The three signals, divided by hairlines.
 *
 * The middle column is wider because it holds four labelled bars rather than a figure and a line.
 */
export function OverviewSignalRow({ children }: { children: ReactNode[] }) {
  return (
    <div
      className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      {children.map((child, index) => (
        <div
          key={index}
          className={index === children.length - 1 ? 'min-w-0' : 'min-w-0 lg:border-r lg:pr-5'}
          style={{ borderColor: 'var(--mantine-color-default-border)' }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
