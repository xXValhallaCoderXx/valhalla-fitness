import { Badge, Button } from '@mantine/core'
import { Download } from 'lucide-react'
import type { SessionLedgerRow } from '~/domains/history/lib/session-ledger'
import { sessionLedgerCsv, sessionLedgerTotals, weekOverWeekTotals } from '~/domains/history/lib/session-ledger'
import { decisionLabel, decisionSubject } from '~/domains/program/lib/decision-labels'
import { decisionUpdate } from '~/domains/session/lib/summary-decisions'
import { useExperienceMode } from '~/domains/account/components'
import type { ProgressionDecision } from '~/domains/program'
import { downloadTextFile } from '~/shared/lib/download-file'
import { Caption, Panel, SectionLabel, StatValue, Text } from '~/components'
import type { Unit } from '~/shared/types'

/**
 * Totals for everything in range, this week against last, and what is waiting on a decision.
 *
 * Totals describe the whole range rather than the current filter: a filtered subtotal beside an
 * unfiltered heading is the kind of number people quote later without the caveat.
 */
export function SessionLedgerRail({
  rows,
  visibleRows,
  now,
  units,
  pendingDecisions,
  onReviewDecisions,
}: {
  rows: SessionLedgerRow[]
  visibleRows: SessionLedgerRow[]
  now: string
  units: Unit | null
  pendingDecisions: ProgressionDecision[]
  onReviewDecisions: () => void
}) {
  const { mode, isFull } = useExperienceMode()
  const totals = sessionLedgerTotals(rows)
  const comparison = weekOverWeekTotals(rows, now)

  return (
    <aside className="flex flex-col gap-4">
      {/* Totals and the week comparison are the design's Full-only inspector. Pending decisions are
          not: "no silent changes" is the point of this screen, so the receipt is reachable in both
          modes. */}
      {isFull ? (
      <Panel p="md">
        <SectionLabel>Totals · everything in range</SectionLabel>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Figure label="sessions" value={String(totals.sessions)} />
          <Figure
            label={totals.completedSets === totals.plannedSets ? 'sets' : `sets of ${totals.plannedSets}`}
            value={String(totals.completedSets)}
          />
          <Figure label="tonnage" value={`${(totals.tonnage / 1000).toFixed(1)} t`} />
          <Figure
            label={totals.averageMinutes === null ? 'no times recorded' : 'average'}
            value={totals.averageMinutes === null ? '—' : `${totals.averageMinutes} min`}
          />
        </div>
        {totals.prCount ? (
          <Caption component="p" mt="sm">
            {totals.prCount} personal best{totals.prCount === 1 ? '' : 's'} among the main lifts.
          </Caption>
        ) : null}
      </Panel>
      ) : null}

      {isFull && comparison ? (
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
          </div>
        </Panel>
      ) : null}

      <Panel p="md">
        <SectionLabel>{decisionLabel('pendingHeading', mode)}</SectionLabel>
        {pendingDecisions.length ? (
          <>
            <div className="mt-2 flex flex-col">
              {pendingDecisions.slice(0, 4).map((decision) => {
                const update = decisionUpdate(decision, units ?? 'kg')
                return (
                  <div
                    key={decision.id}
                    className="border-t py-2 first:border-t-0 first:pt-0"
                    style={{ borderColor: 'var(--mantine-color-default-border)' }}
                  >
                    <Text size="xs" fw={700} className={isFull ? 'font-mono' : undefined} truncate>
                      {decisionSubject(decision, mode)}
                      {update.isNumeric ? ` ${update.fromLabel} → ${update.toLabel}` : ''}
                    </Text>
                    <Caption mt={1} truncate className={isFull ? 'font-mono' : undefined}>
                      {isFull ? decision.ruleId : update.recommendation}
                    </Caption>
                  </div>
                )
              })}
            </div>
            <Button mt="sm" size="xs" variant="default" fullWidth onClick={onReviewDecisions}>
              Review {pendingDecisions.length} decision{pendingDecisions.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : (
          <Caption component="p" mt="sm">{decisionLabel('emptyPending', mode)}</Caption>
        )}
      </Panel>

      {isFull ? (
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
      ) : null}
    </aside>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <StatValue size="md">{value}</StatValue>
      <Caption mt={1}>{label}</Caption>
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
