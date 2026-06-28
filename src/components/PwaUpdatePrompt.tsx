import { Button } from '@mantine/core'
import { RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Heading, Panel, Text } from '~/components'

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
    <Panel
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md md:bottom-4"
      p="sm"
      style={{ boxShadow: 'var(--vf-shadow-panel)' }}
    >
      {updateServiceWorker ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Heading order={2} size="h5">
              Update available
            </Heading>
            <Text component="p" mt={2} size="xs" tone="dimmed">
              Reload when you are ready to use the latest version.
            </Text>
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
            <Heading order={2} size="h5">
              Ready offline
            </Heading>
            <Text component="p" mt={2} size="xs" tone="dimmed">
              The app shell is cached for faster launches.
            </Text>
          </div>
          <Button size="xs" variant="default" onClick={() => setOfflineReady(false)}>
            OK
          </Button>
        </div>
      )}
    </Panel>
  )
}
