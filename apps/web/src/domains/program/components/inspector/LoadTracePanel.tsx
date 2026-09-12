import { Badge } from '@mantine/core'
import { AlertTriangle } from 'lucide-react'
import type { LoadTrace, ProjectedBand } from '~/domains/program/lib/load-trace'
import { Caption, FormulaChip, Panel, SectionLabel, StatValue, Text } from '~/components'

/**
 * Why a planned load is the number it is: the expression, the substitution, the result, and where
 * each input came from.
 *
 * Shown only in Full mode. `showFormulas` governs the expression lines specifically — with it off,
 * the panel still explains the inputs in words, which is the point of the design's split between
 * "Full" and "Full with formulas".
 */
export function LoadTracePanel({
  trace,
  bands,
  showFormulas,
  footer,
}: {
  trace: LoadTrace
  bands?: ProjectedBand[]
  showFormulas: boolean
  footer?: React.ReactNode
}) {
  return (
    <Panel p="md" className="space-y-4" data-testid="load-trace-panel">
      <div>
        <SectionLabel>Trace</SectionLabel>
        <Text mt={2} size="sm" fw={800} lh={1.3}>
          {trace.subject}
        </Text>
        {trace.context ? <Caption mt={1}>{trace.context}</Caption> : null}
      </div>

      <div>
        <StatValue size="xl">{trace.result}</StatValue>
        {trace.overriddenFrom !== null ? (
          <Caption mt={2}>Overridden — the programme computed {trace.overriddenFrom}.</Caption>
        ) : null}
      </div>

      {/* A trace that disagrees with the number beside it must say so rather than look confident. */}
      {!trace.matchesPlannedLoad && trace.overriddenFrom === null ? (
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} color="var(--vf-warning-text)" className="mt-0.5 shrink-0" />
          <Caption component="p" lh={1.45}>
            This working no longer matches the planned load — the reference number has moved since
            the session was scheduled.
          </Caption>
        </div>
      ) : null}

      {showFormulas ? (
        <div>
          <SectionLabel className="mb-2">Formula</SectionLabel>
          <div className="flex flex-col items-start gap-1.5">
            <FormulaChip tone="muted">{trace.expression}</FormulaChip>
            <FormulaChip tone="muted">{trace.substituted}</FormulaChip>
            <FormulaChip result={trace.result}>{trace.evaluated ?? trace.substituted}</FormulaChip>
          </div>
        </div>
      ) : null}

      <div>
        <SectionLabel className="mb-2">Inputs</SectionLabel>
        <div className="flex flex-col">
          {trace.inputs.map((input) => (
            <div
              key={input.label}
              className="border-t py-2 first:border-t-0 first:pt-0"
              style={{ borderColor: 'var(--mantine-color-default-border)' }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <Text component="span" size="xs" fw={700} className="font-mono" tone="dimmed">
                  {input.label}
                </Text>
                <Text component="span" size="sm" fw={800} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {input.value}
                </Text>
              </div>
              {input.provenance ? <Caption mt={1}>{input.provenance}</Caption> : null}
            </div>
          ))}
        </div>
      </div>

      {bands?.length ? (
        <div>
          <SectionLabel className="mb-2">What this set decides</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {bands.map((band) => (
              <div key={band.band} className="flex items-baseline justify-between gap-2">
                <Caption>{band.condition}</Caption>
                <div className="flex shrink-0 items-baseline gap-1.5">
                  <Text component="span" size="xs" fw={800} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {band.value}
                  </Text>
                  <Badge color="neutral" variant="light" size="xs">
                    {band.band}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {footer}
    </Panel>
  )
}
