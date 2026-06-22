import { registerSW } from 'virtual:pwa-register'

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
})
