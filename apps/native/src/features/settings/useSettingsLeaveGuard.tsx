import { useCallback, useEffect, useState } from 'react'
import { BackHandler } from 'react-native'
import { router, useFocusEffect, useNavigation, type Href } from 'expo-router'
import { usePreventRemove } from 'expo-router/react-navigation'
import { ConfirmDialog } from '@/components'
import { settingsNavigationGuard } from './settings-navigation'

export function useSettingsLeaveGuard({ dirty, pending, onDiscard }: {
  dirty: boolean; pending: boolean; onDiscard: () => void
}) {
  const navigation = useNavigation()
  const [action, setAction] = useState<(() => void) | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const request = useCallback((next: () => void) => {
    if (pending) return
    if (dirty) setAction(() => next)
    else next()
  }, [dirty, pending])

  usePreventRemove(dirty || pending, ({ data }) => request(() => navigation.dispatch(data.action)))
  useFocusEffect(useCallback(() => {
    if (!dirty && !pending) return
    const unregister = settingsNavigationGuard.register(request)
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      request(() => router.canGoBack() ? router.back() : router.replace('/(tabs)'))
      return true
    })
    return () => { unregister(); back.remove() }
  }, [dirty, pending, request]))

  useEffect(() => {
    if (!confirmed || dirty || pending || !action) return
    // Wait until the navigator commits the removal guard's clean state.
    const continuation = setTimeout(() => {
      setConfirmed(false)
      setAction(null)
      action()
    }, 0)
    return () => clearTimeout(continuation)
  }, [action, confirmed, dirty, pending])

  return {
    request,
    navigate: (href: Href) => request(() => router.push(href)),
    goBack: () => request(() => router.canGoBack() ? router.back() : router.replace('/(tabs)/you')),
    dialog: <ConfirmDialog open={Boolean(action)} title="Discard unsaved changes?"
      confirmLabel="Discard" cancelLabel="Keep editing" tone="danger" isPending={pending}
      onCancel={() => setAction(null)} onConfirm={() => { onDiscard(); setConfirmed(true) }}>
      Your changes have not been saved. Discard them to continue.
    </ConfirmDialog>,
  }
}
