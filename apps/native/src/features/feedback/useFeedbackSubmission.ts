import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { submitFeedback } from '@sheetless/data/feedback/feedback'
import type { SubmitFeedbackInput } from '@sheetless/domain/feedback/feedback-options'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { buildUserContext } from '@/lib/account'

/** Direct sends: no retries, mutation pause, or durable queue. Each mounted form sends once. */
export function useFeedbackSubmission(user: User) {
  const [state, setState] = useState({ accountId: user.id, pending: false, error: null as string | null, sent: false })
  const current = state.accountId === user.id ? state : { pending: false, error: null, sent: false }
  const operation = useRef({ accountId: user.id, active: true, busy: false, sent: false })
  useEffect(() => {
    const scope = { accountId: user.id, active: true, busy: false, sent: false }
    operation.current = scope
    return () => { scope.active = false }
  }, [user.id])

  const send = async (input: SubmitFeedbackInput) => {
    const scope = operation.current
    if (!scope.active || scope.accountId !== user.id || scope.busy || scope.sent) return false
    scope.busy = true
    setState({ accountId: user.id, pending: true, error: null, sent: false })
    try {
      await submitFeedback(buildUserContext(user), input)
      if (!scope.active) return false
      // Success is final even if a caller's local handled-marker write fails later.
      scope.sent = true
      setState({ accountId: user.id, pending: false, error: null, sent: true })
      return true
    } catch (cause) {
      if (scope.active) setState({ accountId: user.id, pending: false, sent: false,
        error: getApiErrorMessage(cause, 'Could not send feedback. Try again.') })
      return false
    } finally {
      scope.busy = false
    }
  }
  return { send, ...current }
}
