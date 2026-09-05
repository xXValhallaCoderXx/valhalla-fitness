import type { User } from '@supabase/supabase-js'
import type { ReceiptEntry } from '@sheetless/domain/session/session-receipt'
import { Badge, Caption, Panel, SectionLabel, Text } from '@/components'
import { DecisionFeedback } from '@/features/feedback/DecisionFeedback'
import { spacing } from '@/lib/tokens'

export function WhatChangedCard({ receipt, user, sessionId }: { receipt: ReceiptEntry[]; user: User; sessionId: string }) {
  if (!receipt.length) return null
  return <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
    <SectionLabel>What changed</SectionLabel>
    {receipt.map((entry, index) => <Panel key={entry.decision?.id ?? `${entry.movementName}-${index}`} surface="inset" style={{ gap: spacing.xs, padding: spacing.sm }}>
      <Text weight={800}>{entry.movementName}</Text>
      <Caption>{entry.learned}</Caption>
      <Text size="sm">{entry.change}</Text>
      {entry.why ? <Caption>{entry.why}</Caption> : null}
      {entry.decision ? <>
        <Badge tone={entry.decision.status === 'accepted' ? 'success' : 'neutral'}>
          {entry.decision.status === 'pending' ? 'Recommendation · awaiting your choice' : entry.decision.status === 'accepted' ? 'Applied' : entry.decision.status === 'dismissed' ? 'Kept current value' : 'Superseded'}
        </Badge>
        <DecisionFeedback key={`${user.id}-${entry.decision.id}`} user={user} decision={entry.decision} sessionId={sessionId} />
      </> : null}
    </Panel>)}
  </Panel>
}
