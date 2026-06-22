import { Button } from '@mantine/core'
import { RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

export function PwaUpdatePrompt() {
  const [updateServiceWorker, setUpdateServiceWorker] = useState<UpdateServiceWorker | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    void import('~/pwa')

    const handleNeedRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ updateServiceWorker: UpdateServiceWorker }>).detail
      setUpdateServiceWorker(() => detail.updateServiceWorker)
      setOfflineReady(false)
    }
    const handleOfflineReady = () => {
      if (!updateServiceWorker) setOfflineReady(true)
    }

    window.addEventListener('sheetless-pwa-need-refresh', handleNeedRefresh)
    window.addEventListener('sheetless-pwa-offline-ready', handleOfflineReady)
    return () => {
      window.removeEventListener('sheetless-pwa-need-refresh', handleNeedRefresh)
      window.removeEventListener('sheetless-pwa-offline-ready', handleOfflineReady)
    }
  }, [updateServiceWorker])

  if (!updateServiceWorker && !offlineReady) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-3 text-[var(--mantine-color-text)] shadow-[var(--vf-shadow-panel)] md:bottom-4">
      {updateServiceWorker ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold">Update available</p>
            <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">Reload when you are ready to use the latest version.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="xs"
              onClick={() => {
                void updateServiceWorker(true)
              }}
            >
              <RefreshCw size={13} />
              Reload
            </Button>
            <Button size="xs" variant="default" aria-label="Later" onClick={() => setUpdateServiceWorker(null)}>
              <X size={13} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold">Ready offline</p>
            <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">The app shell is cached for faster launches.</p>
          </div>
          <Button size="xs" variant="default" onClick={() => setOfflineReady(false)}>
            OK
          </Button>
        </div>
      )}
    </div>
  )
}
