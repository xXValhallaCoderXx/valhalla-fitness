import type { InsightGate } from '~/domains/history/lib/insight-gates'
import { gateCounter } from './gate-counter'
import { InsightStatCell } from '../insights/InsightStatCell'

/**
 * A headline figure that hasn't earned its data.
 *
 * Keeps the strip's shape — an em-dash where the number goes — and spends the subline saying what
 * opens it, which is the only useful thing it can say.
 */
export function LockedStatCell({ label, gate }: { label: string; gate: InsightGate }) {
  const counter = gateCounter(gate)
  return (
    <div data-testid={`locked-insight-${gate.id}`}>
      <InsightStatCell
        label={label}
        value="—"
        locked
        subline={counter ? `${gate.requirement} · ${counter}` : gate.requirement}
      />
    </div>
  )
}
