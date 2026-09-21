import { createContext, useContext } from 'react'
import type { MovementSlot, SetLog, WorkoutSession } from '@sheetless/domain/session/types/session'

export type RestReceipt = { source: string; movementId: string; setIndex: number; load: number | null; reps: number | null }
export type RestTimerState = {
  endsAt: number | null; active: boolean; label: string | null; source: string | null; receipt: RestReceipt | null
}
export type RestTimerControls = {
  startForSlot: (slot: MovementSlot, source?: string) => void
  trackSave: (slot: MovementSlot, before: SetLog | undefined, mutationId: string, completed: boolean, setIndex: number) => boolean
  confirmSession: (session: WorkoutSession) => void
  dismissForSet: (source: string) => void
  addTime: (seconds: number) => void
  dismiss: () => void
  exit: () => void
  prime: () => void
}
const noop = () => {}
export const IDLE_REST: RestTimerState = { endsAt: null, active: false, label: null, source: null, receipt: null }
export const RestTimerControlsContext = createContext<RestTimerControls>({
  startForSlot: noop, trackSave: () => false, confirmSession: noop, dismissForSet: noop,
  addTime: noop, dismiss: noop, exit: noop, prime: noop,
})
export const RestTimerStateContext = createContext<RestTimerState>(IDLE_REST)
export const useRestTimerControls = () => useContext(RestTimerControlsContext)
export const useRestTimerState = () => useContext(RestTimerStateContext)
