export type NavigationBarModule = {
  setStyle: (style: 'light' | 'dark') => Promise<void>
  setHidden: (hidden: boolean) => Promise<void>
}

type AppLifecycle = {
  readonly currentState: string | null
  addEventListener: (event: 'change', listener: (state: string) => void) => { remove: () => void }
}

/** Own the native promises: Expo's public setStyle/setHidden wrappers return void. */
export function synchronizeNavigationBar(
  module: NavigationBarModule,
  lifecycle: AppLifecycle,
  style: 'light' | 'dark',
  reportError: (error: unknown) => void,
) {
  let disposed = false
  const active = () => !disposed && lifecycle.currentState === 'active'
  const apply = async () => {
    if (!active()) return
    try {
      await module.setHidden(false)
      if (active()) await module.setStyle(style)
    } catch (error) {
      // Activity can disappear between the active check and the main-thread native call.
      // Resume will apply the current theme again; other failures must remain observable.
      const message = error instanceof Error ? error.message : String(error)
      if (!/activity.*(?:no longer available|not available|unavailable)|ERR_NO_CURRENT_ACTIVITY/i.test(message)) reportError(error)
    }
  }
  const subscription = lifecycle.addEventListener('change', state => { if (state === 'active') void apply() })
  void apply()
  return () => { disposed = true; subscription.remove() }
}
