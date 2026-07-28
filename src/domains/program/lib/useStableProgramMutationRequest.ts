import { useCallback, useRef } from 'react'

/**
 * Reuses an idempotency token while the same programme mutation is retried.
 * A changed intent receives a new token; a confirmed success clears it.
 */
export function useStableProgramMutationRequest() {
  const pending = useRef<{ fingerprint: string; requestId: string } | null>(null)

  const requestIdFor = useCallback((intent: unknown) => {
    const fingerprint = JSON.stringify(intent)
    if (pending.current?.fingerprint === fingerprint) return pending.current.requestId
    const requestId = crypto.randomUUID()
    pending.current = { fingerprint, requestId }
    return requestId
  }, [])

  const clearRequest = useCallback(() => {
    pending.current = null
  }, [])

  return { requestIdFor, clearRequest }
}
