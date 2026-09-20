import { Panel, Text } from '~/components'

/**
 * A spreadsheet's formula bar: the selected cell's address, then how its load is worked out.
 *
 * It is a readout, not an input. The `fx` tile is a dark plate rather than a button for that
 * reason — the one affordance a formula bar usually offers is the one this release does not have.
 */
export function TemplateFormulaBar({
  address,
  expression,
}: {
  /** Null until a cell is selected. */
  address: string | null
  expression: string | null
}) {
  return (
    <Panel p={0} className="mb-3 overflow-hidden">
      <div className="flex items-stretch">
        <div
          className="flex shrink-0 items-center px-3"
          style={{ backgroundColor: 'var(--vf-brand-mark)' }}
        >
          <Text component="span" size="xs" fw={800} className="font-mono" c="var(--vf-brand-mark-text)">
            fx
          </Text>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
          <Text component="span" size="xs" fw={800} className="shrink-0 font-mono">
            {address ?? 'select a cell'}
          </Text>
          <span
            aria-hidden="true"
            className="h-4 w-px shrink-0"
            style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
          />
          <Text component="span" size="xs" className="min-w-0 font-mono" tone="dimmed" truncate>
            {expression ?? 'its formula appears here'}
          </Text>
        </div>
      </div>
    </Panel>
  )
}
