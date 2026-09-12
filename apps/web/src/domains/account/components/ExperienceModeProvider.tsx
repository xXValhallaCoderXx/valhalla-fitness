import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { ExperienceMode } from '~/domains/account/types'

export type ExperienceModeContextValue = {
  mode: ExperienceMode
  /** True only in Full mode — `showFormulas` is a Full-only sub-preference. */
  showFormulas: boolean
  isFull: boolean
}

const guidedDefault: ExperienceModeContextValue = {
  mode: 'guided',
  showFormulas: false,
  isFull: false,
}

const ExperienceModeContext = createContext<ExperienceModeContextValue>(guidedDefault)

/**
 * Publishes the account's reading mode to the tree.
 *
 * The value comes from the `me` profile that the root route already resolves server-side, so it is
 * identical on the server and on the first client render. Never derive it from `localStorage`,
 * `matchMedia` or an un-seeded query — a mode that resolves differently after hydration flips the
 * first paint, which is exactly the class of bug the e2e suite keeps catching.
 */
export function ExperienceModeProvider({
  mode,
  showFormulas,
  children,
}: Readonly<{ mode: ExperienceMode; showFormulas: boolean; children: ReactNode }>) {
  const value = useMemo<ExperienceModeContextValue>(
    () => ({ mode, showFormulas: mode === 'full' && showFormulas, isFull: mode === 'full' }),
    [mode, showFormulas],
  )
  return <ExperienceModeContext.Provider value={value}>{children}</ExperienceModeContext.Provider>
}

/** Reads the reading mode. Defaults to Guided, so unwrapped trees (tests) stay plain-spoken. */
export function useExperienceMode(): ExperienceModeContextValue {
  return useContext(ExperienceModeContext)
}
