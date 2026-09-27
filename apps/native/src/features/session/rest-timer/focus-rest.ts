import { advanceAfterLog } from '@sheetless/domain/session/live-focus-utils'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import type { RestTimerState } from './rest-timer-context'

/** Browsing another set never relabels the rest belonging to the confirmed source set. */
export function focusRestTarget(session: WorkoutSession, rest: RestTimerState, movementId: string, setIndex: number) {
  if (!rest.active || !rest.receipt || rest.source !== rest.receipt.source) return null
  const source = session.movements.find(item => item.id === rest.receipt!.movementId)
  if (!source) return null
  const next = advanceAfterLog(session, source.id, rest.receipt.setIndex)
  if (next.kind === 'sessionComplete') return movementId === source.id && setIndex === rest.receipt.setIndex ? next : null
  return next.movementId === movementId && next.setIndex === setIndex ? next : null
}
