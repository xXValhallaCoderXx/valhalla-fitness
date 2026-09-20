import { Lock } from 'lucide-react'
import type { InsightGate } from '~/domains/history/lib/insight-gates'
import { Caption, Text } from '~/components'
import { gateCounter } from './gate-counter'

/**
 * A cell-shaped locked state, for the hairline row where a card would break the columns.
 *
 * Carries a progress bar rather than a ghost chart: in a column this narrow the bar is the only
 * honest way to show how close the insight is.
 */
export function LockedInsightCell({ title, gate }: { title: string; gate: InsightGate }) {
  const counter = gateCounter(gate)
  const percent =
    gate.progress && gate.progress.required > 0
      ? Math.min(100, Math.round((gate.progress.current / gate.progress.required) * 100))
      : 0

  return (
    <div className="min-w-0" data-testid={`locked-insight-${gate.id}`}>
      <span className="flex items-center gap-1.5">
        <Lock size={12} color="var(--mantine-color-dimmed)" className="shrink-0" />
        <Text component="span" size="sm" fw={700}>{title}</Text>
      </span>
      <Caption component="p" mt={4} lh={1.5}>{gate.requirement}</Caption>
      {counter ? (
        <div className="mt-2.5 flex items-center gap-2">
          <span
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: 'var(--vf-surface-inset)' }}
          >
            <span
              className="block h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: 'var(--vf-action-border)' }}
            />
          </span>
          <Caption fw={700} className="shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {counter}
          </Caption>
        </div>
      ) : null}
    </div>
  )
}
