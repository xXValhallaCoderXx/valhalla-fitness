import { Badge, Button, Popover } from '@mantine/core'
import { Check, ChevronDown, ChevronRight, Info, Pencil, RotateCcw } from 'lucide-react'
import { Caption, Heading, SectionLabel, Text } from '~/components'
import { answerLabel, levelTone, tagLabel, type WizardAnswers } from '~/domains/program/lib/find-my-plan'
import {
  FIND_MY_PLAN_QUESTIONS,
  TAG_GLOSSARY,
  type FamilyRecommendation,
} from '~/domains/program/lib/recommend-plan'
import { cn } from '~/shared/lib/cn'
import type { ProgramSetupOptions } from '~/shared/types'
import { ModalHeader } from './FindMyPlanControls'

/** Result phase — the ranked recommendation with an editable recap and a "typical week" peek. */
export function FindMyPlanResult({
  answers,
  activeRec,
  activeIndex,
  goodFits,
  weekOpen,
  weekLoading,
  weekSessions,
  showBrowseAll,
  onEditAnswer,
  onReset,
  onToggleWeek,
  onSelectPlan,
  onStart,
  onClose,
}: {
  answers: WizardAnswers
  activeRec: FamilyRecommendation | undefined
  activeIndex: number
  goodFits: Array<{ rec: FamilyRecommendation; index: number }>
  weekOpen: boolean
  weekLoading: boolean
  weekSessions: NonNullable<ProgramSetupOptions['previewWeeks']>[number]['sessions']
  showBrowseAll: boolean
  onEditAnswer: (index: number) => void
  onReset: () => void
  onToggleWeek: () => void
  onSelectPlan: (index: number) => void
  onStart: () => void
  onClose: () => void
}) {
  const glossedTags = activeRec ? activeRec.template.tags.filter((tag) => TAG_GLOSSARY[tag]) : []
  const isReco = activeIndex === 0

  return (
    <div className="flex h-full flex-col overflow-hidden sm:max-h-[88dvh] md:h-[680px] md:max-h-none">
      <div className="border-b px-5 py-4 md:px-7" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
        <ModalHeader onClose={onClose} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--vf-surface-2)' }}>
        <div className="mx-auto max-w-[40rem] p-5 pb-8 md:p-7 md:pb-10">
          {/* editable recap */}
          <div className="flex flex-wrap items-center gap-2">
            {FIND_MY_PLAN_QUESTIONS.map((item, index) => (
              <button key={item.key} type="button" onClick={() => onEditAnswer(index)} className="vf-chip" data-active="true">
                <Caption component="span" fw={700} c="inherit">
                  {answerLabel(item.key, answers[item.key])}
                </Caption>
                <Pencil size={11} />
              </button>
            ))}
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-1 py-1"
              style={{ color: 'var(--mantine-color-dimmed)' }}
            >
              <RotateCcw size={14} />
              <Caption component="span" fw={600} c="inherit">
                Start over
              </Caption>
            </button>
          </div>

          {activeRec ? (
            <div className="mt-4">
              <Badge color={isReco ? 'action' : 'warning'} variant="light" radius="xl">
                {isReco ? 'We recommend' : 'Also a good fit'}
              </Badge>
              <Heading order={2} size="1.5rem" lh={1.15} mt="sm">
                {activeRec.family.name}
              </Heading>
              <Text component="p" size="sm" fw={700} mt={4}>
                Recommended schedule: {activeRec.template.variantLabel ?? activeRec.template.name}
              </Text>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge color={levelTone(activeRec.template.complexity)} variant="light">
                  {activeRec.template.complexity}
                </Badge>
                <Caption>{activeRec.template.daysPerWeek} days/week</Caption>
                <span className="h-1 w-1 rounded-full" style={{ backgroundColor: 'var(--mantine-color-dimmed)' }} />
                <Caption>{activeRec.template.progressionLabel}</Caption>
              </div>
              <Text component="p" size="sm" tone="dimmed" fw={600} mt="sm" lh={1.55}>
                {activeRec.reason}
              </Text>

              {/* tags + a single glossary popover (tap-friendly — not per-pill toggles) */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {activeRec.template.tags.map((tag) => (
                  <span key={tag} className="vf-chip">
                    <Caption component="span" fw={700} c="inherit">
                      {tagLabel(tag)}
                    </Caption>
                  </span>
                ))}
                {glossedTags.length ? (
                  <Popover withArrow withinPortal shadow="md" radius="md" width={320} position="bottom-start">
                    <Popover.Target>
                      <button type="button" className="vf-chip">
                        <Info size={11} />
                        <Caption component="span" fw={700} c="inherit">
                          What do these mean?
                        </Caption>
                      </button>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <div className="grid gap-2.5">
                        {glossedTags.map((tag) => (
                          <div key={tag}>
                            <Text size="sm" fw={800}>
                              {tagLabel(tag)}
                            </Text>
                            <Caption lh={1.5}>{TAG_GLOSSARY[tag]}</Caption>
                          </div>
                        ))}
                      </div>
                    </Popover.Dropdown>
                  </Popover>
                ) : null}
              </div>

              {/* typical week */}
              <div className="mt-5 flex items-center justify-between">
                <SectionLabel className="hidden md:block">A typical week</SectionLabel>
                <button
                  type="button"
                  onClick={onToggleWeek}
                  className="inline-flex items-center gap-1 md:hidden"
                >
                  <Caption component="span" fw={700} tone="action">
                    {weekOpen ? 'Hide the week' : "See what's inside"}
                  </Caption>
                  <ChevronDown
                    size={16}
                    color="var(--vf-action-text)"
                    style={{ transform: weekOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}
                  />
                </button>
              </div>
              <div className={cn('mt-3 flex-col gap-2', weekOpen ? 'flex' : 'hidden', 'md:flex')}>
                {weekLoading ? (
                  <Caption>Loading the week…</Caption>
                ) : weekSessions.length ? (
                  weekSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start gap-3 rounded-xl border p-3"
                      style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--mantine-color-default)' }}
                    >
                      <span className="shrink-0 rounded-md px-2 py-1" style={{ backgroundColor: 'var(--vf-action-soft)' }}>
                        <Caption component="span" fw={800} tone="action">
                          {session.label}
                        </Caption>
                      </span>
                      <div className="min-w-0">
                        <Text component="p" size="sm" fw={700}>
                          {session.title}
                        </Text>
                        <Caption component="p" mt={2} lh={1.4}>
                          {session.movementSummary}
                        </Caption>
                      </div>
                    </div>
                  ))
                ) : (
                  <Caption>Plan preview is unavailable right now.</Caption>
                )}
              </div>

              {/* actions */}
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Button className="flex-1" onClick={onStart}>
                  <Check size={16} />
                  View plan
                </Button>
                {showBrowseAll ? (
                  <Button variant="default" onClick={onClose}>
                    Browse all
                  </Button>
                ) : null}
              </div>

              {/* other good fits */}
              {goodFits.length ? (
                <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
                  <SectionLabel>Other good fits</SectionLabel>
                  <div className="mt-3 flex flex-col gap-2">
                    {goodFits.map(({ rec, index }) => (
                      <button
                        key={rec.template.id}
                        type="button"
                        onClick={() => onSelectPlan(index)}
                        className="vf-card-hover flex items-center gap-3 rounded-xl border p-3 text-left"
                        style={{ borderColor: 'var(--mantine-color-default-border)', backgroundColor: 'var(--mantine-color-default)' }}
                      >
                        <span
                          className="h-9 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: `var(--vf-${levelTone(rec.template.complexity)}-text)` }}
                        />
                        <span className="min-w-0 flex-1">
                          <Text component="span" size="sm" fw={700} className="block" truncate>
                            {rec.family.name}
                          </Text>
                          <Caption component="span" className="block">
                            {rec.template.complexity} · {rec.template.variantShortLabel ?? `${rec.template.daysPerWeek} days`} · {rec.template.progressionLabel}
                          </Caption>
                        </span>
                        <ChevronRight size={16} color="var(--mantine-color-dimmed)" className="shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Text component="p" tone="dimmed" fw={600} mt="md">
              No plans are available right now.
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}
