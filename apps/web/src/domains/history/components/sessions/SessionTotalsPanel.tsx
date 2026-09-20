import { Badge, Button } from '@mantine/core'
import { Download } from 'lucide-react'
import type { SessionLedgerRow } from '~/domains/history/lib/session-ledger'
import { sessionLedgerCsv, sessionLedgerTotals, weekOverWeekTotals } from '~/domains/history/lib/session-ledger'
import { weeklyRirComparison } from '~/domains/history/lib/calibration'
import type { CalibrationSummary } from '~/domains/history'
import { useExperienceMode } from '~/domains/account/components'
import { downloadTextFile } from '~/shared/lib/download-file'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { InsightStatCell } from '../insights/InsightStatCell'

/**
 * What the range adds up to — the Full-only half of the ledger's rail.
 *
 * Totals describe the whole range rather than the current filter: a filtered subtotal beside an
 * unfiltered heading is the kind of number people quote later without the caveat.
 */
export function SessionTotalsPanel({
  rows,
  visibleRows,
  now,
  calibration,
  units,
}: {
  rows: SessionLedgerRow[]
  /** What is actually on screen — the export writes these, not the whole range. */
  visibleRows: SessionLedgerRow[]
  now: string
  calibration: CalibrationSummary
  units: string | null
}) {
  const { mode } = useExperienceMode()
  const totals = sessionLedgerTotals(rows)
  const comparison = weekOverWeekTotals(rows, now)
  const rir = weeklyRirComparison(calibration.weekly, now)

  return (
    <div className="flex flex-col gap-4">
      <Panel p="md">
        <SectionLabel>Totals · everything in range</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <InsightStatCell label="Sessions" value={totals.sessions} subline="completed in range" />
          <InsightStatCell
            label="Sets"
            value={totals.completedSets}
            subline={totals.completedSets === totals.plannedSets ? 'all planned sets' : `of ${totals.plannedSets} planned`}
          />
          <InsightStatCell
            label="Tonnage"
            value={`${(totals.tonnage / 1000).toFixed(1)} t`}
            subline={units ? `weight moved · ${units}` : 'weight moved'}
          />
          <InsightStatCell
            label="Average"
            value={totals.averageMinutes === null ? '—' : `${totals.averageMinutes} min`}
            subline={totals.averageMinutes === null ? 'no times recorded' : 'per session'}
          />
        </div>
        {totals.prCount ? (
          <Caption component="p" mt="sm">
            {totals.prCount} personal best{totals.prCount === 1 ? '' : 's'} among the main lifts.
          </Caption>
        ) : null}
      </Panel>

      {comparison ? (
        <Panel p="md">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SectionLabel>This week vs last</SectionLabel>
            {/* The current week is unfinished; saying so stops a Monday reading as a collapse. */}
            <Badge color="neutral" variant="light" size="xs">in progress</Badge>
          </div>
          <div className="mt-2 flex flex-col">
            <Comparison
              label="Sessions"
              current={String(comparison.current.sessions)}
              previous={`vs ${comparison.previous.sessions}`}
            />
            <Comparison
              label="Tonnage"
              current={`${(comparison.current.tonnage / 1000).toFixed(1)} t`}
              previous={`vs ${(comparison.previous.tonnage / 1000).toFixed(1)} t`}
            />
            {/* Plan sessions only — `buildCalibration` never reads ad-hoc work. */}
            {rir && rir.current !== null && rir.previous !== null ? (
              <Comparison
                label="Mean RIR · plan sessions"
                current={String(rir.current)}
                previous={`vs ${rir.previous}${rir.target === null ? '' : ` · target ${rir.target}`}`}
              />
            ) : null}
          </div>
        </Panel>
      ) : null}

      <Button
        variant="default"
        size="xs"
        onClick={() =>
          downloadTextFile(
            `sheetless-sessions-${now.slice(0, 10)}.csv`,
            sessionLedgerCsv(visibleRows, mode),
            'text/csv',
          )
        }
      >
        <Download size={14} />
        Export these rows · CSV
      </Button>
    </div>
  )
}

function Comparison({ label, current, previous }: { label: string; current: string; previous: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 border-t py-2 first:border-t-0 first:pt-0"
      style={{ borderColor: 'var(--mantine-color-default-border)' }}
    >
      <Caption>{label}</Caption>
      <div className="flex shrink-0 items-baseline gap-2">
        <Text size="sm" fw={800} style={{ fontVariantNumeric: 'tabular-nums' }}>{current}</Text>
        <Caption>{previous}</Caption>
      </div>
    </div>
  )
}
