/** Port of apps/web/src/domains/session/lib/rest-timer-context.ts. */
import { createContext, useContext } from 'react'
import type { MovementSlot } from '@sheetless/domain/session/types/session'

export type RestTimerControls = {
  /** Start (or restart) the rest countdown for a just-completed set of this slot. */
  startForSlot: (slot: MovementSlot) => void
  /** Extend the running timer by `seconds`. No-op when inactive. */
  addTime: (seconds: number) => void
  /** Stop and hide the timer. */
  dismiss: () => void
  /** Web unlocks its audio cue in the tap gesture; kept as a no-op for hook-shape parity. */
  prime: () => void
}

export type RestTimerState = {
  /** Wall-clock end time (ms epoch), or null when idle. */
  endsAt: number | null
  active: boolean
  /** Movement name to caption the pill. */
  label: string | null
}

const noop = () => {}

// Defaults are no-ops so the set-log hook can call controls before the provider
// lands in R1 (and in tests) without throwing.
export const RestTimerControlsContext = createContext<RestTimerControls>({
  startForSlot: noop,
  addTime: noop,
  dismiss: noop,
  prime: noop,
})

export const RestTimerStateContext = createContext<RestTimerState>({
  endsAt: null,
  active: false,
  label: null,
})

export function useRestTimerControls() {
  return useContext(RestTimerControlsContext)
}

export function useRestTimerState() {
  return useContext(RestTimerStateContext)
}
