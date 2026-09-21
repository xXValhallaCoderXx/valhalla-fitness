import { useEffect, useState, type ReactNode } from 'react'
import { AppState, View } from 'react-native'
import { useMe } from '@/lib/account'
import { cancelRestEnd, scheduleRestEnd } from '@/lib/rest-notifications'
import { IDLE_REST, RestTimerControlsContext, RestTimerStateContext } from './rest-timer-context'
import { createRestTimerController } from './rest-timer-controller'
import { RestTimerPill } from './RestTimerPill'

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const me = useMe().data
  const autoStartTimer = me?.autoStartTimer ?? true
  const defaultRestSeconds = me?.defaultRestSeconds ?? 120
  const [state, setState] = useState(IDLE_REST)
  const [timer] = useState(() => createRestTimerController({
    schedule: scheduleRestEnd, cancel: cancelRestEnd, onChange: setState,
  }))
  useEffect(() => { timer.configure({ autoStartTimer, defaultRestSeconds }) }, [timer, autoStartTimer, defaultRestSeconds])
  useEffect(() => {
    timer.mount()
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') timer.foreground() })
    return () => { subscription.remove(); timer.dispose() }
  }, [timer])
  return (
    <RestTimerControlsContext.Provider value={timer.controls}>
      <RestTimerStateContext.Provider value={state}>
        <View style={{ flex: 1 }}>{children}<RestTimerPill /></View>
      </RestTimerStateContext.Provider>
    </RestTimerControlsContext.Provider>
  )
}
