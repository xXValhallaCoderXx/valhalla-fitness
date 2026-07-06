import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '~/domains/account/queries'
import type { MovementSlot } from '~/shared/types'
import { resolveRestSeconds } from '~/domains/session/lib/rest-timer'
import { primeRestCue } from '~/domains/session/lib/rest-timer-cue'
import {
  RestTimerControlsContext,
  RestTimerStateContext,
  type RestTimerControls,
  type RestTimerState,
} from '~/domains/session/lib/rest-timer-context'
import { RestTimerPill } from './RestTimerPill'

const IDLE: RestTimerState = { endsAt: null, active: false, label: null }
const FALLBACK_PREFS = { autoStartTimer: true, defaultRestSeconds: 120 }

/**
 * Session-scoped rest timer. Mounted once around both the Overview and Focus branches (which stay
 * mounted behind a CSS toggle), so a running timer survives the view swap. State changes only on
 * start/dismiss/extend — the per-second tick lives in `RestTimerPill`, and `children` is a stable
 * prop so ticks never re-render the session tree.
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const me = useQuery(meQueryOptions()).data
  const autoStartTimer = me?.autoStartTimer ?? FALLBACK_PREFS.autoStartTimer
  const defaultRestSeconds = me?.defaultRestSeconds ?? FALLBACK_PREFS.defaultRestSeconds

  const [state, setState] = useState<RestTimerState>(IDLE)

  // Deps are the two primitive prefs, so `controls` only changes on a settings save — never on a
  // timer start/tick — keeping the set-log hook's context stable during a workout.
  const controls = useMemo<RestTimerControls>(
    () => ({
      startForSlot: (slot: MovementSlot) => {
        const seconds = resolveRestSeconds(slot, { autoStartTimer, defaultRestSeconds })
        if (seconds == null) return
        setState({ endsAt: Date.now() + seconds * 1000, active: true, label: slot.movementName })
      },
      addTime: (seconds: number) =>
        setState((current) =>
          current.active && current.endsAt != null ? { ...current, endsAt: current.endsAt + seconds * 1000 } : current,
        ),
      dismiss: () => setState(IDLE),
      prime: () => primeRestCue(),
    }),
    [autoStartTimer, defaultRestSeconds],
  )

  // A backgrounded tab freezes the pill's interval; on return, drop a timer that already elapsed
  // while hidden (the pill recomputes the live remaining time from the wall-clock endsAt itself).
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setState((current) =>
        current.active && current.endsAt != null && current.endsAt <= Date.now() ? IDLE : current,
      )
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <RestTimerControlsContext.Provider value={controls}>
      <RestTimerStateContext.Provider value={state}>
        {children}
        <RestTimerPill />
      </RestTimerStateContext.Provider>
    </RestTimerControlsContext.Provider>
  )
}
