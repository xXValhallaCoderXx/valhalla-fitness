import type { ReactNode } from 'react'
import { useExperienceMode } from '~/domains/account/components'

/**
 * Two-column shell for a docked inspector.
 *
 * The aside only exists in Full mode, and only from `lg` up — the same breakpoint the navigation
 * rail uses, so the two never disagree about how much horizontal room there is. In Guided the
 * children render exactly as they would without this wrapper, with no extra DOM.
 *
 * The Full/Guided split comes from the SSR-seeded provider rather than a media query, so the first
 * paint is already correct; only the `lg` half is CSS.
 */
export function InspectorLayout({
  children,
  inspector,
}: {
  children: ReactNode
  /** Null collapses the layout back to a single column — no empty rail. */
  inspector?: ReactNode | null
}) {
  const { isFull } = useExperienceMode()
  if (!isFull || !inspector) return <>{children}</>

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="min-w-0">{children}</div>
      <aside className="hidden lg:sticky lg:top-2 lg:block" aria-label="Trace">
        {inspector}
      </aside>
    </div>
  )
}
