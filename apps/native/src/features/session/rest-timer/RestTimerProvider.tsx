import { useEffect, useState, type ReactNode } from 'react'
import { AppState, View } from 'react-native'
import { useMe } from '@/lib/account'
import { cancelRestEnd, scheduleRestEnd } from '@/lib/rest-notifications'
import { playRestCompleteCue } from '@/lib/rest-cue'
import { IDLE_REST, RestTimerControlsContext, RestTimerStateContext } from './rest-timer-context'
import { createRestTimerController } from './rest-timer-controller'

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const me = useMe().data
  const autoStartTimer = me?.autoStartTimer ?? true
  const defaultRestSeconds = me?.defaultRestSeconds ?? 120
  const [state, setState] = useState(IDLE_REST)
  const [timer] = useState(() => createRestTimerController({
    schedule: scheduleRestEnd, cancel: cancelRestEnd, onChange: setState, cue: playRestCompleteCue,
  }))
  useEffect(() => { timer.configure({ autoStartTimer, defaultRestSeconds }) }, [timer, autoStartTimer, defaultRestSeconds])
  useEffect(() => {
    timer.mount()
    let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive'
    const subscription = AppState.addEventListener('change', next => {
      foreground = next === 'active'
      if (foreground) timer.foreground()
    })
    // The timer owns expiry even when neither of its visual presenters is mounted.
    const interval = setInterval(() => { if (foreground) timer.tick() }, 250)
    return () => { clearInterval(interval); subscription.remove(); timer.dispose() }
  }, [timer])
  return (
    <RestTimerControlsContext.Provider value={timer.controls}>
      <RestTimerStateContext.Provider value={state}>
        <View style={{ flex: 1 }}>{children}</View>
      </RestTimerStateContext.Provider>
    </RestTimerControlsContext.Provider>
  )
}
