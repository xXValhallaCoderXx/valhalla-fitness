import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, SectionLabel, StatValue } from '~/components'

/**
 * One headline figure: what it is, what it says, and where it came from.
 *
 * Shared by every Insights tab's stat strip.
 *
 * Becomes a button when `onSelect` is passed, so Full can dock a trace against it. `aria-pressed`
 * rather than `role="option"` — there is no listbox here, and the cell is a toggle, not a choice
 * from a list.
 */
export function InsightStatCell({
  label,
  value,
  subline,
  locked = false,
  selected = false,
  onSelect,
}: {
  label: string
  value: ReactNode
  subline: ReactNode
  locked?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5">
        {locked ? <Lock size={11} color="var(--mantine-color-dimmed)" className="shrink-0" /> : null}
        <SectionLabel component="span" tone={selected ? 'action' : undefined}>
          {label}
        </SectionLabel>
      </span>
      <StatValue component="span" display="block" size="xl" mt={6} lh={1} lts="-0.8px">
        {value}
      </StatValue>
      <Caption component="span" display="block" mt={5} lh={1.4}>
        {subline}
      </Caption>
    </>
  )

  if (!onSelect) return <div className="min-w-0">{body}</div>

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="-m-2 min-w-0 p-2 text-left"
      style={{
        appearance: 'none',
        background: selected ? 'var(--vf-action-soft)' : 'none',
        borderRadius: 'var(--mantine-radius-md)',
        boxShadow: selected ? 'inset 0 0 0 1px var(--vf-action-border)' : undefined,
        cursor: 'pointer',
      }}
    >
      {body}
    </button>
  )
}
