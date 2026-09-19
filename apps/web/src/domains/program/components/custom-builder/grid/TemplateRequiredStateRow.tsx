import { stateKeyLabel } from '~/domains/program/lib/load-trace'
import type { TemplateDefinition } from '~/domains/program'
import { Caption, Panel, SectionLabel, Text } from '~/components'

/**
 * The programme state the definition needs, and what it is worth today.
 *
 * A chip row under the grid rather than a column in the rail: these values are inputs to every cell
 * above, so they read as a footnote to the whole table, not to the selected one.
 */
export function TemplateRequiredStateRow({
  definition,
  stateValues,
  units,
}: {
  definition: TemplateDefinition
  stateValues: Record<string, number>
  units: string
}) {
  return (
    <Panel p="sm" className="mt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SectionLabel className="shrink-0">Required state</SectionLabel>
        {definition.requiredState.length ? (
          <>
            {definition.requiredState.map((state) => (
              <span
                key={state.key}
                className="flex items-center gap-1.5 rounded-md px-2 py-1"
                style={{
                  backgroundColor: 'var(--vf-surface-inset)',
                  border: '1px solid var(--mantine-color-default-border)',
                }}
              >
                <Text component="span" size="xs" fw={700} className="font-mono" tone="dimmed">
                  {stateKeyLabel(state.key, state.type)}
                </Text>
                <Text
                  component="span"
                  size="xs"
                  fw={800}
                  className="font-mono"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {stateValues[state.key] === undefined ? '—' : `${stateValues[state.key]} ${units}`}
                </Text>
              </span>
            ))}
            <Caption className="shrink-0">resolved from your current numbers</Caption>
          </>
        ) : (
          <Caption>This programme prescribes no loads, so it needs no state.</Caption>
        )}
      </div>
    </Panel>
  )
}
