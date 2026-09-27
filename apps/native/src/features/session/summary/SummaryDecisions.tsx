import { useState } from 'react'
import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import type { Unit } from '@sheetless/domain/shared/types'
import { Badge, Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { DecisionFeedback } from '@/features/feedback/DecisionFeedback'
import { useProgressionReview } from '@/features/program/progression/useProgressionReview'
import { spacing, useTokens } from '@/lib/tokens'
import { recapDecisionView, simpleRecapChange } from './recap-progression'

export function SummaryDecisions({ decisions, units, user, onResolved, advanced = false }: {
  decisions: ProgressionDecision[]
  units: Unit
  user: User
  onResolved: (id: string, action: 'accepted' | 'dismissed') => void
  advanced?: boolean
}) {
  const { theme } = useTokens()
  const review = useProgressionReview({ user, onResolved })
  const [attempted, setAttempted] = useState<string[]>([])
  const pending = decisions.filter(decision => decision.status === 'pending')
  // A response may be lost after commit. The fresh receipt, not the transport error, wins.
  const unresolvedError = review.errorMessage && pending.some(decision => attempted.includes(decision.id))
  const allApplied = decisions.every(decision => decision.status === 'accepted')
  return <Panel surface="inset" style={{ padding: spacing.md, gap: spacing.sm,
    backgroundColor: allApplied ? theme.tones.success.soft : theme.surface2,
    borderColor: allApplied ? theme.tones.success.border : theme.border }}>
    <SectionLabel>{advanced && allApplied ? 'Progression applied' : 'What happens next'}</SectionLabel>
    {decisions.map((decision, index) => {
      const view = recapDecisionView(decision, units)
      return <View key={decision.id} style={{ gap: spacing.xs,
        ...(index ? { borderTopWidth: 1, borderColor: theme.border, paddingTop: spacing.sm } : {}) }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.xs }}>
          <Text weight={800} style={{ flexGrow: 1 }}>{view.name}{advanced && view.kindLabel ? ` · ${view.kindLabel.toLowerCase()}` : ''}</Text>
          <Badge tone={view.tone}>{view.label}</Badge>
        </View>
        {!advanced ? <Text size="sm" weight={700}>{simpleRecapChange(decision, units)}</Text> : null}
        <Text size="sm" weight={advanced ? 700 : 500}>{view.change}</Text>
        <Caption>{view.reason}</Caption>
        {decision.status === 'pending' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button label="Apply" accessibilityLabel={`Apply ${decision.movementName} recommendation`} disabled={review.isSaving}
            onPress={() => { setAttempted([decision.id]); review.resolve({ decisionId: decision.id, action: 'accepted' }) }} />
          <Button label="Keep" accessibilityLabel={`Keep current ${decision.movementName} value`} variant="default" disabled={review.isSaving}
            onPress={() => { setAttempted([decision.id]); review.resolve({ decisionId: decision.id, action: 'dismissed' }) }} />
        </View> : null}
        <DecisionFeedback key={`${user.id}-${decision.id}`} user={user} decision={decision} />
      </View>
    })}
    {unresolvedError ? <Text size="sm" tone="danger">{review.errorMessage} Retry Apply or Keep to save your choice.</Text> : null}
    {pending.length > 1 ? <Button label={`Apply all ${pending.length}`} fullWidth loading={review.isApplyingAll}
      disabled={review.isSaving && !review.isApplyingAll} onPress={() => {
        const ids = pending.map(decision => decision.id)
        setAttempted(ids)
        review.applyAll(ids)
      }} /> : null}
  </Panel>
}
