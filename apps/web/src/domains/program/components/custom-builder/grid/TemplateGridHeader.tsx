import { Badge, Switch } from '@mantine/core'
import { Caption, Heading, SectionLabel } from '~/components'

/**
 * The grid's own header: what this definition is, and the two controls that act on it.
 *
 * The comp's action bar also carries "Save as template". It is deliberately absent: the wizard's
 * Create button runs the only mutation this page has, and two buttons for one save is how you end
 * up unsure which one you pressed.
 */
export function TemplateGridHeader({
  name,
  seededLabel,
  heading,
  durationWeeks,
  daysPerWeek,
  valid,
  showFormulas,
  onShowFormulasChange,
}: {
  /** The draft's name — the grid is a view of that programme, not of the page. */
  name: string
  seededLabel: string
  /** Mode-dependent section label, e.g. "Definition grid". */
  heading: string
  durationWeeks: number
  daysPerWeek: number
  valid: boolean
  showFormulas: boolean
  onShowFormulasChange: (showFormulas: boolean) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <SectionLabel>{heading}</SectionLabel>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Heading order={2} size="h4" lh={1.15}>
            {name.trim() || 'Untitled programme'} · custom
          </Heading>
          <Badge color="neutral" variant="light" size="xs">{seededLabel}</Badge>
        </div>
        <Caption component="p" mt={2}>
          {durationWeeks} week{durationWeeks === 1 ? '' : 's'} · {daysPerWeek} day
          {daysPerWeek === 1 ? '' : 's'} · read-only
        </Caption>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Switch
          size="xs"
          checked={showFormulas}
          label="Formulas"
          onChange={(event) => onShowFormulasChange(event.currentTarget.checked)}
        />
        <Badge color={valid ? 'success' : 'danger'} variant="light" size="sm">
          {valid ? 'Valid' : 'Invalid'}
        </Badge>
      </div>
    </div>
  )
}
