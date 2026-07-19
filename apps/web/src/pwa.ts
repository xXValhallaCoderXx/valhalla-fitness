import { registerSW } from 'virtual:pwa-register'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60_000

let cleanupUpdateChecks: (() => void) | null = null

export const updateServiceWorker = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(
      new CustomEvent('sheetless-pwa-need-refresh', {
        detail: { updateServiceWorker },
      }),
    )
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('sheetless-pwa-offline-ready'))
  },
  onRegisteredSW(_swScriptUrl, registration) {
    setupUpdateChecks(registration)
  },
})

function setupUpdateChecks(registration: ServiceWorkerRegistration | undefined) {
  cleanupUpdateChecks?.()
  cleanupUpdateChecks = null

  if (!registration || typeof window === 'undefined' || typeof document === 'undefined') return

  const requestUpdate = () => {
    if (document.visibilityState !== 'visible') return
    void registration.update().catch(() => {
      // Update checks are opportunistic; failed checks should not interrupt app use.
    })
  }
  const handleVisibilityChange = () => requestUpdate()
  const handleFocus = () => requestUpdate()
  const intervalId = window.setInterval(requestUpdate, UPDATE_CHECK_INTERVAL_MS)

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleFocus)
  requestUpdate()

  cleanupUpdateChecks = () => {
    window.clearInterval(intervalId)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleFocus)
  }
}
