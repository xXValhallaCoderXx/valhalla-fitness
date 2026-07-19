import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
    mutations: {
      retry: 0,
    },
  },
})

export function installNativeQueryManagers() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))),
  )
  const onAppStateChange = (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active')
  }
  onAppStateChange(AppState.currentState)
  const subscription = AppState.addEventListener('change', onAppStateChange)
  return () => subscription.remove()
}
