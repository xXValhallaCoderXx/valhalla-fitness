import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { createNativeSetupDraft, type NativeProgramSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import type { ProgramSetupSuggestionSnapshot } from '@sheetless/domain/program/setup-suggestions'

export const programSetupDraftKey = (userId: string, draftId: string) => ['account', userId, 'program-setup-drafts', draftId] as const
export const programSetupReceiptKey = (userId: string, draftId: string) => ['account', userId, 'program-setup-receipts', draftId] as const
export function setupRequestId() {
  return `setup-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}
export function initializeProgramSetupDraft(client: QueryClient, userId: string, snapshot: ProgramSetupSuggestionSnapshot) {
  const draftId = setupRequestId()
  const key = programSetupDraftKey(userId, draftId)
  client.setQueryDefaults(key, { gcTime: Infinity, staleTime: Infinity })
  client.setQueryData(key, createNativeSetupDraft(userId, draftId, snapshot))
  return draftId
}
export function clearProgramSetupDraft(client: QueryClient, userId: string, draftId: string) {
  client.removeQueries({ queryKey: programSetupDraftKey(userId, draftId), exact: true })
  client.removeQueries({ queryKey: ['account', userId, 'program-setup-return'], predicate: (query) =>
    (query.state.data as { draftId?: string } | undefined)?.draftId === draftId })
}
export function useProgramSetupDraft(userId: string, draftId: string) {
  const client = useQueryClient()
  const queryKey = programSetupDraftKey(userId, draftId)
  const { data } = useQuery<NativeProgramSetupDraft>({ queryKey, queryFn: () => { throw new Error('Setup draft expired.') }, enabled: false, staleTime: Infinity, gcTime: Infinity })
  return { draft: data, update: (updater: (draft: NativeProgramSetupDraft) => NativeProgramSetupDraft) => {
    client.setQueryData<NativeProgramSetupDraft>(queryKey, (current) => current?.accountId === userId ? updater(current) : current)
  }, clear: () => clearProgramSetupDraft(client, userId, draftId) }
}
