import { Badge, Button, Modal, SegmentedControl } from '@mantine/core'
import { Sparkles } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import type { ProgramTemplateSummary } from '~/shared/types'
import {
  DAYS_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  recommendPlan,
  type ExperienceLevel,
  type PlanGoal,
} from '~/domains/program/lib/recommend-plan'

/**
 * Short questionnaire that recommends one starting plan. The recommendation
 * updates live as answers change (recommendPlan is pure), and the full library
 * stays one click away via "Browse all plans".
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

  const recommendation = useMemo(
    () => recommendPlan(templates, { experience, days: Number(days), goal }),
    [templates, experience, days, goal],
  )

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      radius="lg"
      title={
        <span className="flex items-center gap-2">
          <Sparkles size={16} color="var(--vf-action-text)" />
          <Text component="span" fw={800}>Find my plan</Text>
        </span>
      }
    >
      <Text size="sm" tone="dimmed">
        Answer three quick questions and we&apos;ll suggest a starting point — you can still browse everything.
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

      {recommendation ? (
        <Panel className="mt-5" p="md" style={{ borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)' }}>
          <SectionLabel>We recommend</SectionLabel>
          <Heading order={2} size="h4" mt="xs">{recommendation.template.name}</Heading>
          <Text mt={4} size="sm">{recommendation.reason}</Text>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge color="action">{recommendation.template.complexity}</Badge>
            <Badge>{recommendation.template.daysPerWeek} days/week</Badge>
            <Badge color="neutral">{recommendation.template.progressionLabel}</Badge>
          </div>
          <Caption mt="sm" lineClamp={3}>{recommendation.template.description}</Caption>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="sm:flex-1" onClick={() => onStart(recommendation.template.id)}>
              Start this plan
            </Button>
            <Button variant="default" className="sm:flex-1" onClick={onClose}>
              Browse all plans
            </Button>
          </div>
        </Panel>
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
