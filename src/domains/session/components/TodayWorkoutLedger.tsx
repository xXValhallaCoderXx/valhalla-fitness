import { Clock } from 'lucide-react'
import { Caption, CollapsiblePanel, SectionLabel, Text } from '~/components'
import { buildTodayLedgerCaption, buildTodayLedgerRows } from '~/domains/session/lib/today-numbers'
import type { PlannedSession } from '~/shared/types'

// Sheet-ledger columns: exercise flexes, Sets/Target are fixed numeric columns the eye can run down.
const LEDGER_GRID = 'grid grid-cols-[minmax(0,1fr)_72px_74px] items-baseline gap-x-2'
const NUMERIC = { fontVariantNumeric: 'tabular-nums' } as const

/** "Today's workout" drawer as a spreadsheet-style ledger: Exercise / Sets / Target. */
export function TodayWorkoutLedger({ session }: { session: PlannedSession }) {
  const rows = buildTodayLedgerRows(session)
  return (
    <CollapsiblePanel data-testid="today-workout" title="Today's workout" summary={buildTodayLedgerCaption(session)}>
      <div className={`${LEDGER_GRID} pb-1.5`} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <SectionLabel>Exercise</SectionLabel>
        <SectionLabel ta="right">Sets</SectionLabel>
        <SectionLabel ta="right">Target</SectionLabel>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.slotId}
          className={`${LEDGER_GRID} py-3`}
          style={index ? { borderTop: '1px solid var(--mantine-color-default-border)' } : undefined}
        >
          <div className="min-w-0">
            <Text size="md" fw={700} lh={1.2} truncate>{row.movementName}</Text>
            {row.historyLine ? (
              <div className="mt-0.5 flex min-w-0 items-center gap-1">
                <Clock size={10} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                <Caption truncate>{row.historyLine}</Caption>
              </div>
            ) : null}
          </div>
          <Text size="sm" fw={600} tone="dimmed" ta="right" style={NUMERIC}>
            {row.setsLabel}
          </Text>
          {row.targetIsLoad ? (
            <Text size="md" fw={800} ta="right" style={NUMERIC}>
              {row.targetLabel}
            </Text>
          ) : (
            <Text size="sm" fw={700} tone="dimmed" ta="right">
              {row.targetLabel}
            </Text>
          )}
        </div>
      ))}
    </CollapsiblePanel>
  )
}
