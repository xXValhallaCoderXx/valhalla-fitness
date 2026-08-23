/**
 * Native port of the web RestTimerProvider. Session-scoped: state changes only
 * on start/dismiss/extend — the per-second tick lives in RestTimerPill, and
 * `controls` is memoized on the two pref primitives so ticks and timer starts
 * never re-render the session tree. visibilitychange becomes AppState.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AppState, View } from 'react-native'
import type { MovementSlot } from '@sheetless/domain/session/types/session'
import { resolveRestSeconds } from '@sheetless/domain/session/rest-timer'
import { useMe } from '@/lib/account'
import { cancelRestEnd, scheduleRestEnd } from '@/lib/rest-notifications'
import {
  RestTimerControlsContext,
  RestTimerStateContext,
  type RestTimerControls,
  type RestTimerState,
} from '@/features/session/rest-timer-context'
import { RestTimerPill } from '@/features/session/RestTimerPill'

const IDLE: RestTimerState = { endsAt: null, active: false, label: null }
const FALLBACK_PREFS = { autoStartTimer: true, defaultRestSeconds: 120 }

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const me = useMe().data
  const autoStartTimer = me?.autoStartTimer ?? FALLBACK_PREFS.autoStartTimer
  const defaultRestSeconds = me?.defaultRestSeconds ?? FALLBACK_PREFS.defaultRestSeconds

  const [state, setState] = useState<RestTimerState>(IDLE)
  // The background notification mirroring the running timer (null = none scheduled).
  const notificationId = useRef<string | null>(null)

  const controls = useMemo<RestTimerControls>(() => {
    const reschedule = (endsAt: number, label: string | null) => {
      const previous = notificationId.current
      notificationId.current = null
      void cancelRestEnd(previous)
      void scheduleRestEnd(endsAt, label).then((id) => {
        notificationId.current = id
      })
    }
    const cancel = () => {
      const previous = notificationId.current
      notificationId.current = null
      void cancelRestEnd(previous)
    }
    return {
      startForSlot: (slot: MovementSlot) => {
        const seconds = resolveRestSeconds(slot, { autoStartTimer, defaultRestSeconds })
        if (seconds == null) return
        const endsAt = Date.now() + seconds * 1000
        reschedule(endsAt, slot.movementName)
        setState({ endsAt, active: true, label: slot.movementName })
      },
      addTime: (seconds: number) =>
        setState((current) => {
          if (!current.active || current.endsAt == null) return current
          const endsAt = current.endsAt + seconds * 1000
          reschedule(endsAt, current.label)
          return { ...current, endsAt }
        }),
      dismiss: () => {
        cancel()
        setState(IDLE)
      },
      prime: () => {},
    }
  }, [autoStartTimer, defaultRestSeconds])

  // Leaving the session screen unmounts the provider — never leave a stray alarm behind.
  useEffect(
    () => () => {
      void cancelRestEnd(notificationId.current)
    },
    [],
  )

  // A backgrounded app freezes the pill's interval; on return, drop a timer that
  // already elapsed while away (the pill recomputes live remaining from endsAt).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return
      setState((current) =>
        current.active && current.endsAt != null && current.endsAt <= Date.now() ? IDLE : current,
      )
    })
    return () => subscription.remove()
  }, [])

  return (
    <RestTimerControlsContext.Provider value={controls}>
      <RestTimerStateContext.Provider value={state}>
        <View style={{ flex: 1 }}>
          {children}
          <RestTimerPill />
        </View>
      </RestTimerStateContext.Provider>
    </RestTimerControlsContext.Provider>
  )
}
