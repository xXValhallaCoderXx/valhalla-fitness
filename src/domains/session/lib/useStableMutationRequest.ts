import { useCallback, useRef } from 'react'

/**
 * Keeps one idempotency token for retries of the same user intent. A changed
 * payload gets a fresh token; a confirmed success clears the prior attempt.
 */
export function useStableMutationRequest() {
  const pending = useRef<{ fingerprint: string; requestId: string } | null>(null)

  const requestIdFor = useCallback((intent: unknown) => {
    const fingerprint = JSON.stringify(intent)
    if (pending.current?.fingerprint === fingerprint) return pending.current.requestId
    const requestId = crypto.randomUUID()
    pending.current = { fingerprint, requestId }
    return requestId
  }, [])

  const clearRequest = useCallback((requestId?: string) => {
    if (!requestId || pending.current?.requestId === requestId) pending.current = null
  }, [])

  return { requestIdFor, clearRequest }
}
