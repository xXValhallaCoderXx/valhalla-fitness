import { Badge } from '@mantine/core'
import type { ReactNode } from 'react'
import { useExperienceMode } from '~/domains/account/components'
import type { InsightGate } from '~/domains/history/lib/insight-gates'
import { thinDataBadgeLabel } from '~/domains/history/lib/insight-labels'
import { Caption } from '~/components'
import { LockedInsightCard } from '../cards/LockedInsightCard'

/**
 * One insight, behind its data gate.
 *
 * Guided swaps a card that hasn't earned its data for a locked state, so the screen never shows an
 * empty box without saying why. Full keeps the real card and flags the thin sample instead — the
 * design's rule is that Full never hides a number, it qualifies it.
 *
 * `locked` exists because the comp's three-column row is cells, not cards: a card-shaped locked
 * state inside a hairline column would break the row.
 */
export function GatedInsight({
  gate,
  title,
  locked,
  children,
}: {
  gate: InsightGate
  title: string
  /** Locked presentation for this slot; defaults to the card. */
  locked?: ReactNode
  children: ReactNode
}) {
  const { isFull } = useExperienceMode()

  if (gate.unlocked) return <>{children}</>
  if (!isFull) return <>{locked ?? <LockedInsightCard title={title} gate={gate} />}</>

  return (
    <div className="flex flex-col gap-1.5">
      {children}
      <div className="flex items-center gap-2 px-1">
        <Badge color="warning" variant="light" data-testid={`thin-data-${gate.id}`}>
          {thinDataBadgeLabel}
        </Badge>
        <Caption>{gate.requirementTechnical}</Caption>
      </div>
    </div>
  )
}
