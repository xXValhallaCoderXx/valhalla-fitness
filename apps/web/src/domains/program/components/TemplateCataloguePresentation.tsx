import { Badge, Button } from '@mantine/core'
import { Eye, RotateCcw, Sparkles, type LucideIcon } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import type { ProgramOverview, ProgramTemplateSummary } from '~/domains/program'
import { complexityColor } from './TemplateCard'

export function TemplateFinderPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <Panel className="mb-4 max-w-4xl" p="sm" style={{ borderColor: 'var(--vf-action-border)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
          >
            <Sparkles size={18} color="var(--vf-action-text)" />
          </div>
          <div className="min-w-0">
            <Text fw={800} size="sm">Not sure where to start?</Text>
            <Caption>Answer three quick questions and we&apos;ll pick a plan for you.</Caption>
          </div>
        </div>
        <Button className="shrink-0" onClick={onOpen}>
          <Sparkles size={15} />
          Find my plan
        </Button>
      </div>
    </Panel>
  )
}

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

export function ActiveProgramBand({
  template,
  position,
  className,
  onResume,
  onView,
}: {
  template: ProgramTemplateSummary
  position: ProgramOverview['position']
  className?: string
  onResume: () => void
  onView: () => void
}) {
  // Week-based progress (matches "Week X of Y"); position.progressPercent is a session metric
  // that can exceed 100% for short repeating templates, so it's not used for the bar.
  const percent =
    position && position.totalWeeks > 0
      ? Math.min(100, Math.max(0, Math.round((position.weekNumber / position.totalWeeks) * 100)))
      : null
  const showProgress = position != null && percent != null

  return (
    <Panel
      className={`relative overflow-hidden ${className ?? ''}`}
      p="md"
      style={{ borderColor: 'var(--vf-action-border)' }}
    >
      <div className="vf-radial-glow absolute inset-0" aria-hidden />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge color="action" variant="filled">Active program</Badge>
            <Badge color={template.origin === 'user_created' ? 'accent' : 'neutral'} variant="light">
              {template.sourceLabel}
            </Badge>
          </div>
          <Heading order={2} size="h3" className="truncate">
            {template.name}
          </Heading>
          <Text mt={3} size="sm" tone="dimmed" lineClamp={2}>
            {template.description}
          </Text>
          {showProgress ? (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Caption fw={700}>
                  Week {position.weekNumber} of {position.totalWeeks} · {position.phaseLabel}
                </Caption>
                <Caption fw={800} tone="action">{percent}%</Caption>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-3)' }}>
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${percent}%`, backgroundColor: 'var(--vf-action-text)' }}
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <ActiveBandMetric label="Days" value={`${template.daysPerWeek}/wk`} />
            <ActiveBandMetric label="Level" value={template.complexity} valueColor={complexityColor(template.complexity)} />
          </div>
          <Button onClick={onResume}>
            <RotateCcw size={16} />
            Resume training
          </Button>
          <Button variant="default" onClick={onView}>
            <Eye size={16} />
            View plan
          </Button>
        </div>
      </div>
    </Panel>
  )
}

function ActiveBandMetric({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <Panel surface="inset" px="xs" py={6} className="min-w-0">
      <SectionLabel size="0.5625rem" truncate>{label}</SectionLabel>
      <Text mt={2} size="xs" fw={900} truncate c={valueColor}>{value}</Text>
    </Panel>
  )
}
