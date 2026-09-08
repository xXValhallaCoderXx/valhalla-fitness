import { Box } from '@mantine/core'
import { Text } from './Text'

/**
 * A spreadsheet expression, rendered as one.
 *
 * Monospace matters here — these are formulas, and proportional digits make `=MROUND(192.5 × 0.95,
 * 2.5)` hard to scan. There is no monospace token in the theme and no webfont budget for one, so
 * this uses the `ui-monospace` system stack.
 */
export function FormulaChip({
  children,
  result,
  tone = 'action',
}: {
  children: React.ReactNode
  /** Rendered bold after an arrow — the value the expression produces. */
  result?: string | null
  /** `muted` for the intermediate steps, `action` for the line that yields the result. */
  tone?: 'action' | 'muted'
}) {
  const isAction = tone === 'action'
  return (
    <Box
      className="inline-flex max-w-full flex-wrap items-baseline gap-1 rounded-md px-1.5 py-1"
      bg={isAction ? 'var(--vf-action-soft)' : 'var(--vf-surface-2)'}
      style={{
        border: `1px solid ${isAction ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
      }}
    >
      <Text
        component="span"
        size="xs"
        className="font-mono"
        c={isAction ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)'}
        style={{ wordBreak: 'break-word' }}
      >
        {children}
      </Text>
      {result ? (
        <>
          <Text component="span" size="xs" tone="dimmed" aria-hidden="true">
            →
          </Text>
          <Text component="span" size="xs" fw={800} className="font-mono" c="var(--vf-action-text)">
            {result}
          </Text>
        </>
      ) : null}
    </Box>
  )
}
