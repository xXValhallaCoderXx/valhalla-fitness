import type { QueryClient } from '@tanstack/react-query'
import type { NativeProgramSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import { programSetupDraftKey, setupRequestId } from './setup-draft'

type SetupReturn = { token: string; accountId: string; draftId: string; templateId: string; sessionId: string }
const returnKey = (userId: string, sessionId: string) => ['account', userId, 'program-setup-return', sessionId] as const

/** A one-use continuation tied to a live account draft, never an arbitrary return URL. */
export function registerSetupReturn(client: QueryClient, userId: string, draftId: string, sessionId: string) {
  const draft = client.getQueryData<NativeProgramSetupDraft>(programSetupDraftKey(userId, draftId))
  if (!draft || draft.accountId !== userId || draft.draftId !== draftId || draft.receipt) return null
  const token = setupRequestId()
  const key = returnKey(userId, sessionId)
  client.setQueryDefaults(key, { gcTime: Infinity, staleTime: Infinity })
  client.setQueryData<SetupReturn>(key, { token, accountId: userId, draftId, templateId: draft.templateId, sessionId })
  return token
}

export function consumeSetupReturn(client: QueryClient, userId: string, sessionId: string) {
  const key = returnKey(userId, sessionId)
  const context = client.getQueryData<SetupReturn>(key)
  client.removeQueries({ queryKey: key, exact: true })
  if (!context?.token || context.accountId !== userId || context.sessionId !== sessionId) return null
  const draftKey = programSetupDraftKey(userId, context.draftId)
  const draft = client.getQueryData<NativeProgramSetupDraft>(draftKey)
  if (!draft || draft.accountId !== userId || draft.draftId !== context.draftId
    || draft.templateId !== context.templateId || draft.receipt) return null
  client.setQueryData<NativeProgramSetupDraft>(draftKey, {
    ...draft, step: 'review', review: draft.submission ? draft.review : null,
  })
  return { pathname: '/template/[templateId]/setup' as const,
    params: { templateId: draft.templateId, draftId: draft.draftId } }
}
