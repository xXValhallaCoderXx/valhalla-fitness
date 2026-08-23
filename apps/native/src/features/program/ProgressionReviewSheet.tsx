import { useMemo, useState } from 'react'
import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { Button, Caption, SheetModal, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { ProgressionDecisionCard } from './ProgressionDecisionCard'
import {
  type ProgressionDecisionState,
  useProgressionReview,
} from './useProgressionReview'

export function ProgressionReviewSheet({
  open,
  decisions,
  units,
  user,
  contextLabel,
  onClose,
}: {
  open: boolean
  decisions: ProgressionDecision[]
  units: Unit
  user: User
  contextLabel?: string
  onClose: () => void
}) {
  const [lifts, setLifts] = useState<ProgressionDecision[]>(() =>
    open ? decisions : [],
  )
  const [decided, setDecided] = useState<Map<string, ProgressionDecisionState>>(
    () => new Map(),
  )
  const [previousOpen, setPreviousOpen] = useState(open)
  if (open !== previousOpen) {
    setPreviousOpen(open)
    if (open) {
      // Snapshot each newly-opened review so resolved rows remain visible while
      // Today and Plan reconcile their pending lists in the background.
      setLifts(decisions)
      setDecided(new Map())
    }
  }

  const review = useProgressionReview({
    user,
    onResolved: (decisionId, action) =>
      setDecided((current) =>
        new Map(current).set(decisionId, action === 'accepted' ? 'accepted' : 'kept'),
      ),
  })
  const pending = useMemo(
    () => lifts.filter((decision) => !decided.has(decision.id)),
    [decided, lifts],
  )
  const reviewedCount = lifts.length - pending.length
  const subtitle = `${contextLabel ? `${contextLabel} · ` : ''}${lifts.length} change${lifts.length === 1 ? '' : 's'} to review`

  return (
    <SheetModal
      open={open}
      title="Progression review"
      subtitle={subtitle}
      footer={
        <View style={{ gap: spacing.sm }}>
          {review.errorMessage ? (
            <Text size="sm" tone="danger">
              {review.errorMessage}
            </Text>
          ) : null}
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: spacing.sm,
              justifyContent: 'space-between',
            }}
          >
            <Caption>
              {pending.length
                ? `${reviewedCount} of ${lifts.length} reviewed`
                : `All ${lifts.length} reviewed`}
            </Caption>
            {pending.length ? (
              <Button
                label={`Apply all ${pending.length}`}
                loading={review.isApplyingAll}
                disabled={review.isSaving && !review.isApplyingAll}
                onPress={() => review.applyAll(pending.map((decision) => decision.id))}
              />
            ) : (
              <Button label="Done" onPress={onClose} />
            )}
          </View>
        </View>
      }
      closeDisabled={review.isSaving}
      onClose={onClose}
      testID="progression-review-sheet"
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ gap: spacing.xs }}>
          <Caption tone="success">
            Nothing changes until you choose. Closing keeps these decisions for next time.
          </Caption>
          {pending.length ? (
            <Button
              label="Decide later"
              variant="subtle"
              disabled={review.isSaving}
              onPress={onClose}
            />
          ) : null}
        </View>

        {lifts.length ? (
          lifts.map((decision) => (
            <ProgressionDecisionCard
              key={decision.id}
              decision={decision}
              units={units}
              state={decided.get(decision.id)}
              isSaving={review.isSaving}
              onResolve={(action) => review.resolve({ decisionId: decision.id, action })}
            />
          ))
        ) : (
          <Text tone="dimmed">No pending progression decisions.</Text>
        )}
      </View>
    </SheetModal>
  )
}
