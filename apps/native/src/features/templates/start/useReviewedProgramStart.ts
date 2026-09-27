import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useIsFocused } from 'expo-router'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import type { ProgramSetupOptions } from '@sheetless/domain/program/types'
import type { ProgramStartDraft, ProgramStartReceipt, ReviewedProgramStartIntent } from '@sheetless/domain/program/reviewed-start'
import { setupDraftStateValues, type NativeProgramSetupDraft } from '@sheetless/domain/program/native-setup-draft'
import { reviewProgramStart, startReviewedProgram } from '@sheetless/data/program/reviewed-start'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { buildUserContext } from '@/lib/account'
import { clearProgramSetupDraft, programSetupReceiptKey, setupRequestId } from '../setup-draft'

type DraftUpdate = (updater: (draft: NativeProgramSetupDraft) => NativeProgramSetupDraft) => void
type ReplacementConfirmation = { ownerKey: string; revision: number; intent: ReviewedProgramStartIntent }
function startErrorMessage(message: string) {
  if (/PROGRAM_START_ACCOUNT_CHANGED/.test(message)) return 'Your account changed. Return to plan setup with your current account.'
  if (/ACTIVE_SESSION|ACTIVE_WORKOUT/.test(message)) return 'A workout is already in progress. Refresh this review, then resume it before starting your plan.'
  if (/PENDING_PROGRESSION|PENDING_REVIEW/.test(message)) return 'Progression needs your review. Refresh this review to resolve those changes first.'
  if (/TEMPLATE_STALE|POLICY.*STALE|NOT_AVAILABLE/.test(message)) return 'This plan or its equipment options have changed. Reload setup to review the latest version.'
  if (/REVIEW_STALE|MISMATCH|REVIEW_REQUIRED/.test(message)) return 'Your current plan changed. Refresh this review before confirming your new plan.'
  if (/STATE_INVALID|INPUT_INVALID|VALIDATION_FAILED/.test(message)) return 'Some setup values are no longer valid for this plan. Reload setup and review your starting numbers.'
  if (/IDEMPOTENCY_CONFLICT|IDEMPOTENCY_KEY_REUSED/.test(message)) return 'This start request no longer matches your reviewed setup. Refresh this review before trying again.'
  return message
}
export function buildSetupReviewInput(draft: NativeProgramSetupDraft, setup: ProgramSetupOptions, profile: UserProfile): ProgramStartDraft {
  const custom = draft.customizations
  return {
    templateId: draft.templateId, timeZone: profile.timezone ?? undefined,
    units: draft.units, rounding: draft.rounding, stateValues: setupDraftStateValues(draft),
    movementOverrides: custom.movementOverrides,
    accessoryAdditions: custom.accessoryAdditions.map(({ sessionId, sourceSlotId, movementId, phaseKey }) => ({ sessionId, sourceSlotId, movementId, phaseKey })),
    equipmentMode: custom.equipmentMode,
    ...(custom.equipmentMode === 'free_weight' ? {
      freeWeightPolicyVersionId: setup.freeWeightPolicy?.id, freeWeightPolicyChecksum: setup.freeWeightPolicy?.checksum,
      freeWeightChoices: custom.choiceState.choices,
    } : {}),
  }
}

export function useReviewedProgramStart({ user, profile, setup, draft, update, reviewNeeded }: {
  user: User; profile: UserProfile; setup: ProgramSetupOptions; draft: NativeProgramSetupDraft
  update: DraftUpdate; reviewNeeded: boolean
}) {
  const client = useQueryClient()
  const focused = useIsFocused()
  const ownerKey = `${user.id}:${draft.draftId}`
  const owner = useRef<string | null>(null)
  useLayoutEffect(() => { owner.current = ownerKey; return () => { owner.current = null } }, [ownerKey])
  const [error, setError] = useState<string | null>(null)
  const [replacement, setReplacement] = useState<ReplacementConfirmation | null>(null)
  const [needsFreshReview, setNeedsFreshReview] = useState(false)
  const mutationKey = ['startReviewedProgram', user.id, draft.draftId]
  const pending = useIsMutating({ mutationKey }) > 0
  const valid = setupDraftStateValues(draft).every((state) => state.value !== null) && !reviewNeeded
  const reviewEnabled = focused && draft.step === 'review' && valid && !draft.submission
  const review = useQuery({
    queryKey: ['account', user.id, 'program-start-review', draft.draftId, draft.revision],
    queryFn: async () => {
      const result = await reviewProgramStart(buildUserContext(user), buildSetupReviewInput(draft, setup, profile))
      if (owner.current === ownerKey) update((current) => current.templateId === draft.templateId && current.revision === draft.revision && !current.submission ? { ...current, review: result } : current)
      return result
    },
    enabled: reviewEnabled,
    staleTime: 0, gcTime: 0, retry: false,
  })
  const refetchReview = review.refetch
  useEffect(() => {
    if (!reviewEnabled) return
    let previous = AppState.currentState
    const subscription = AppState.addEventListener('change', (next) => {
      const returning = (previous === 'background' || previous === 'inactive') && next === 'active'
      previous = next
      if (returning) void refetchReview()
    })
    return () => subscription.remove()
  }, [reviewEnabled, refetchReview])
  const mutation = useMutation({
    mutationKey, scope: { id: `account:${user.id}:program-start` },
    mutationFn: (variables: { user: User; draftId: string; submission: NonNullable<NativeProgramSetupDraft['submission']> }) => startReviewedProgram(buildUserContext(variables.user), variables.submission),
    onSuccess: (receipt: ProgramStartReceipt, variables) => {
      if (owner.current !== `${variables.user.id}:${variables.draftId}`) return
      client.setQueryDefaults(programSetupReceiptKey(user.id, draft.draftId), { staleTime: Infinity, gcTime: Infinity })
      client.setQueryData(programSetupReceiptKey(user.id, draft.draftId), receipt)
      clearProgramSetupDraft(client, variables.user.id, variables.draftId)
      for (const queryKey of [accountQueryKeys.today(user.id), accountQueryKeys.program(user.id), accountQueryKeys.history(user.id), accountQueryKeys.sessions(user.id)]) {
        void client.invalidateQueries({ queryKey })
      }
    },
    onError: (failure, variables) => {
      if (owner.current !== `${variables.user.id}:${variables.draftId}`) return
      const message = failure instanceof Error ? failure.message : 'The plan could not be saved. Retry to confirm its result.'
      setError(startErrorMessage(message))
      setReplacement(null)
      setNeedsFreshReview(/STALE|NOT_AVAILABLE|MISMATCH|ACTIVE_SESSION|ACTIVE_WORKOUT|PENDING_PROGRESSION|PENDING_REVIEW|REVIEW_REQUIRED|IDEMPOTENCY_CONFLICT|IDEMPOTENCY_KEY_REUSED|STATE_INVALID|INPUT_INVALID|VALIDATION_FAILED|ACCOUNT_CHANGED/i.test(message))
    },
  })
  const replacementMatches = Boolean(replacement && replacement.ownerKey === ownerKey && replacement.revision === draft.revision
    && review.data?.canStart && JSON.stringify(replacement.intent) === JSON.stringify(review.data.intent))
  const submit = (confirmation?: ReplacementConfirmation | null) => {
    // Read the cache synchronously: two presses can precede useIsMutating's render.
    if (owner.current !== ownerKey || pending || client.isMutating({ mutationKey }) > 0 || needsFreshReview) return
    const frozen = draft.submission
    const current = review.data
    if (!frozen && (!current?.canStart || review.isFetching || review.isError || !valid)) return
    if (!frozen && current?.activeProgram && (!confirmation || !replacementMatches)) return
    const submission = frozen ?? { requestId: setupRequestId(), intent: confirmation?.intent ?? current!.intent }
    update((value) => ({ ...value, submission }))
    setError(null)
    mutation.mutate({ user, draftId: draft.draftId, submission })
  }
  const refresh = () => {
    if (pending || client.isMutating({ mutationKey }) > 0) return
    setError(null)
    setNeedsFreshReview(false)
    setReplacement(null)
    update((value) => ({ ...value, review: null, submission: null, revision: value.revision + 1 }))
  }
  return {
    review: draft.submission ? draft.review : review.data,
    loading: review.isFetching, error: error ?? (review.error instanceof Error ? startErrorMessage(review.error.message) : null),
    pending, frozen: Boolean(draft.submission), needsFreshReview, replaceOpen: replacementMatches && !review.isFetching && !review.isError, valid,
    ready: Boolean(draft.submission ? !needsFreshReview : review.data?.canStart && !review.isFetching && !review.isError && valid),
    requestStart: () => {
      if (draft.submission) submit()
      else if (review.data?.activeProgram && review.data.canStart && !review.isFetching && !review.isError && valid) {
        setReplacement({ ownerKey, revision: draft.revision, intent: review.data.intent })
      }
      else submit()
    },
    confirmReplace: () => { if (replacementMatches) submit(replacement) }, cancelReplace: () => { if (!pending) setReplacement(null) }, refresh,
  }
}

export type ReviewedProgramStartController = ReturnType<typeof useReviewedProgramStart>
