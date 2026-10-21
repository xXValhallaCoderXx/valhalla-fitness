import { useEffect } from 'react'
import { AppState } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import { synchronizeNavigationBar, type NavigationBarModule } from './navigation-bar-lifecycle'

const navigationBar = requireOptionalNativeModule<NavigationBarModule>('ExpoNavigationBar')

/** Expo's declarative component restores the bar during Activity teardown without awaiting it. */
export function AppNavigationBar({ style }: { style: 'light' | 'dark' }) {
  useEffect(() => {
    if (!navigationBar) return
    return synchronizeNavigationBar(navigationBar, AppState, style, error => {
      console.warn('Unable to update Android navigation bar.', error)
    })
  }, [style])
  return null
}
