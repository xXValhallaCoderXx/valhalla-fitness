import type { TemplateSetRow } from '~/domains/program/lib/template-grid'
import { Caption, SectionLabel, Text } from '~/components'

/**
 * `[Set | Target | Load]` — the cell's sets as the comp's three-column table.
 *
 * The top set is tinted rather than merely labelled: it is the set the week is built around and the
 * one the progression rule reads, so it should be findable without parsing four rows of notation.
 */
export function TemplateCellSetsTable({ rows, units }: { rows: TemplateSetRow[]; units: string }) {
  return (
    <div>
      <div
        className="flex items-baseline justify-between gap-3 pb-1.5"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <SectionLabel component="span" className="w-8 shrink-0">Set</SectionLabel>
        <SectionLabel component="span" className="min-w-0 flex-1">Target</SectionLabel>
        <SectionLabel component="span" className="shrink-0">Load</SectionLabel>
      </div>
      <div className="flex flex-col">
        {rows.map((entry) => (
          <div
            key={entry.label}
            className="flex items-baseline justify-between gap-3 border-t px-1 py-2 first:border-t-0"
            style={{
              borderColor: 'var(--mantine-color-default-border)',
              backgroundColor: entry.isTopSet ? 'var(--vf-action-soft)' : undefined,
            }}
          >
            <Caption className="w-8 shrink-0" fw={entry.isTopSet ? 800 : undefined}>{entry.label}</Caption>
            <Caption className="min-w-0 flex-1">{entry.target}</Caption>
            <Text component="span" size="xs" fw={800} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {entry.formula.result === null ? '—' : `${entry.formula.result} ${units}`}
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}
