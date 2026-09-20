import type { ReactNode } from 'react'
import { Caption, Heading, Text } from '~/components'

/**
 * The block header each Insights tab opens with.
 *
 * An h2, not an h1: the page already has "Insights" above it, and this titles a region.
 *
 * `note` is for the tabs the range switch does not reach. A control that silently disappears reads
 * as a bug; a sentence saying the figures are all-time reads as a decision.
 */
export function InsightTabHeader({
  title,
  subtitle,
  actions,
  note,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  /** Scope sentence for tabs with no range control. */
  note?: string
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <Heading order={2} size="h4" lh={1.15}>{title}</Heading>
          {subtitle ? (
            <Text
              component="p"
              mt={3}
              size="sm"
              tone="dimmed"
              lh={1.4}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {subtitle}
            </Text>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {note ? <Caption component="p">{note}</Caption> : null}
    </div>
  )
}
