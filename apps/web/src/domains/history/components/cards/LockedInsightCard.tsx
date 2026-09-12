import { Badge } from '@mantine/core'
import { Lock } from 'lucide-react'
import type { InsightGate } from '~/domains/history/lib/insight-gates'
import { Caption, Panel, SectionLabel, Text } from '~/components'

/**
 * A card that hasn't earned its data yet.
 *
 * Shown only in Guided — Full renders the real card and flags the thin sample instead, because a
 * lifter reading the technical view would rather see a shaky number than an empty box.
 *
 * The requirement sentence and the counter both come from the gate, which reads the same constants
 * the maths gates on, so this can never promise a threshold the code doesn't honour.
 */
export function LockedInsightCard({
  title,
  gate,
  children,
}: {
  title: string
  gate: InsightGate
  /** Optional one-line description of what the card will show once it opens. */
  children?: React.ReactNode
}) {
  const { progress } = gate
  const counter =
    progress && progress.current < progress.required
      ? `${progress.subject ? `${progress.subject} ` : ''}${progress.current} of ${progress.required}`
      : null

  return (
    <Panel p="md" data-testid={`locked-insight-${gate.id}`}>
      <div className="flex items-start justify-between gap-3">
        <SectionLabel>{title}</SectionLabel>
        <Badge color="neutral" variant="light" style={{ flexShrink: 0 }}>
          Example
        </Badge>
      </div>

      <GhostChart />

      <div className="mt-3 flex items-start gap-2">
        <Lock size={13} color="var(--mantine-color-dimmed)" className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <Caption component="p" lh={1.45}>
            {gate.requirement}
            {children ? ' ' : null}
            {children}
          </Caption>
        </div>
        {counter ? (
          <Text component="span" size="xs" fw={800} tone="dimmed" className="shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {counter}
          </Text>
        ) : null}
      </div>
    </Panel>
  )
}

/**
 * A muted stand-in for the chart that will appear here. Deliberately inert and unlabelled — it
 * shows the shape of what's coming without implying any of these numbers are real.
 */
function GhostChart() {
  const bars = [38, 52, 45, 63, 58, 72]
  return (
    <div aria-hidden="true" className="mt-3 flex h-20 items-end gap-1.5 opacity-40">
      {bars.map((height, index) => (
        <div
          key={index}
          className="flex-1 rounded-sm"
          style={{ height: `${height}%`, backgroundColor: 'var(--vf-surface-inset)' }}
        />
      ))}
    </div>
  )
}
