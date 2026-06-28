import { Badge, Button, Modal, SegmentedControl } from '@mantine/core'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import type { ProgramTemplateSummary } from '~/shared/types'
import {
  DAYS_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  recommendPlans,
  type ExperienceLevel,
  type PlanGoal,
} from '~/domains/program/lib/recommend-plan'

/**
 * Short questionnaire that recommends a few starting plans, best fit first. The list
 * updates live as answers change (recommendPlans is pure), and the full library stays
 * one click away via "Browse all plans".
 */
export function FindMyPlanModal({
  opened,
  onClose,
  templates,
  onStart,
}: {
  opened: boolean
  onClose: () => void
  templates: ProgramTemplateSummary[]
  onStart: (templateId: string) => void
}) {
  const [experience, setExperience] = useState<ExperienceLevel>('Beginner')
  const [days, setDays] = useState('3')
  const [goal, setGoal] = useState<PlanGoal>('simple')

  const recommendations = useMemo(
    () => recommendPlans(templates, { experience, days: Number(days), goal }, 3),
    [templates, experience, days, goal],
  )
  const [primary, ...alternatives] = recommendations

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      radius="lg"
      title={
        <span className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
          >
            <Sparkles size={16} color="var(--vf-action-text)" />
          </span>
          <Text component="span" fw={800}>Find my plan</Text>
        </span>
      }
    >
      <Text size="sm" tone="dimmed">
        Answer three quick questions and we&apos;ll suggest a few plans that fit — you can still browse everything.
      </Text>

      <div className="mt-4 space-y-4">
        <Question label="How much lifting experience do you have?">
          <SegmentedControl
            fullWidth
            value={experience}
            onChange={(value) => setExperience(value as ExperienceLevel)}
            data={EXPERIENCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </Question>
        <Question label="How many days a week can you train?">
          <SegmentedControl
            fullWidth
            value={days}
            onChange={setDays}
            data={DAYS_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }))}
          />
        </Question>
        <Question label="What's your main goal?">
          <SegmentedControl
            fullWidth
            value={goal}
            onChange={(value) => setGoal(value as PlanGoal)}
            data={GOAL_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </Question>
      </div>

      {primary ? (
        <>
          <Panel className="mt-5" p="md" style={{ borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)' }}>
            <SectionLabel>We recommend</SectionLabel>
            <Heading order={2} size="h4" mt="xs">{primary.template.name}</Heading>
            <Text mt={4} size="sm">{primary.reason}</Text>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge color="action">{primary.template.complexity}</Badge>
              <Badge>{primary.template.daysPerWeek} days/week</Badge>
              <Badge color="neutral">{primary.template.progressionLabel}</Badge>
            </div>
            <Caption mt="sm" lineClamp={3}>{primary.template.description}</Caption>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button className="sm:flex-1" onClick={() => onStart(primary.template.id)}>
                Start this plan
              </Button>
              <Button variant="default" className="sm:flex-1" onClick={onClose}>
                Browse all plans
              </Button>
            </div>
          </Panel>

          {alternatives.length ? (
            <div className="mt-4">
              <SectionLabel className="mb-2">Other good fits</SectionLabel>
              <div className="grid gap-2">
                {alternatives.map((alt) => (
                  <button
                    key={alt.template.id}
                    type="button"
                    onClick={() => onStart(alt.template.id)}
                    className="vf-card-hover flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left"
                    style={{
                      borderColor: 'var(--mantine-color-default-border)',
                      backgroundColor: 'var(--vf-surface-2)',
                    }}
                  >
                    <div className="min-w-0">
                      <Text fw={700} size="sm" truncate>{alt.template.name}</Text>
                      <Caption truncate>
                        {alt.template.complexity} · {alt.template.daysPerWeek} days/week · {alt.template.progressionLabel}
                      </Caption>
                    </div>
                    <ChevronRight size={16} color="var(--mantine-color-dimmed)" className="shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <Text mt="md" size="sm" tone="dimmed">No plans are available right now.</Text>
      )}
    </Modal>
  )
}

function Question({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <SectionLabel className="mb-1.5">{label}</SectionLabel>
      {children}
    </div>
  )
}
