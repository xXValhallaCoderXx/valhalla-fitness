import { Badge, Button } from '@mantine/core'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel } from '~/components'
import type { ProgramOverview, ProgramTemplateSummary } from '~/domains/program'

export function TemplateSectionHeader({
  icon: Icon,
  label,
  count,
  countLabel = 'matching',
  helper,
}: {
  icon: LucideIcon
  label: string
  count: number
  countLabel?: string
  helper: string
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
        >
          <Icon size={20} color="var(--vf-action-text)" />
        </div>
        <div className="min-w-0">
          <SectionLabel>{label}</SectionLabel>
          <Caption mt={2}>{helper}</Caption>
        </div>
      </div>
      <Badge color="neutral" variant="light">{count} {countLabel}</Badge>
    </div>
  )
}

/**
 * The programme currently running, above the library.
 *
 * One line of context and one way in. The progress bar, metric tiles and second CTA the previous
 * version carried all restate what Plan says better — this band's job is to get you there.
 */
export function ActiveProgramBand({
  template,
  position,
  className,
  onView,
}: {
  template: ProgramTemplateSummary
  position: ProgramOverview['position']
  className?: string
  onView: () => void
}) {
  const meta = [
    position ? `Week ${position.weekNumber} of ${position.totalWeeks}` : null,
    position?.phaseLabel,
    `${template.daysPerWeek} days a week`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Panel
      className={className}
      p="md"
      data-testid="active-programme-band"
      style={{ backgroundColor: 'var(--vf-bg-elevated)' }}
    >
      {/* Layout on a plain div: Paper's unlayered `display` reset beats a layered flex utility. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <SectionLabel tone="action">Your active programme</SectionLabel>
          <Heading mt={4} order={2} size="h3" lh={1.15} className="truncate">
            {template.name}
          </Heading>
          <Caption mt={4}>{meta}</Caption>
        </div>
        <Button className="shrink-0" onClick={onView}>
          View plan
          <ArrowRight size={15} />
        </Button>
      </div>
    </Panel>
  )
}
