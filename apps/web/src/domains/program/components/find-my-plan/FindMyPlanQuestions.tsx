import { ChevronLeft, RefreshCw, Scale, TrendingUp } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { FIND_MY_PLAN_QUESTIONS } from '~/domains/program/lib/recommend-plan'
import { answerLabel, RECAP_KEYS, type WizardAnswers } from '~/domains/program/lib/find-my-plan'
import { ModalHeader, OptionCard, ProgressBar, Reassurance } from './FindMyPlanControls'

/** Question phase — one question at a time with a desktop-only recap/reassurance panel. */
export function FindMyPlanQuestions({
  step,
  answers,
  onChoose,
  onBack,
  onClose,
}: {
  step: number
  answers: WizardAnswers
  onChoose: (value: string | number) => void
  onBack: () => void
  onClose: () => void
}) {
  const totalSteps = FIND_MY_PLAN_QUESTIONS.length
  const question = FIND_MY_PLAN_QUESTIONS[step]
  const progressPct = Math.round(((step + 1) / totalSteps) * 100)

  return (
    <div className="flex h-full flex-col overflow-hidden sm:max-h-[88dvh] md:h-[680px] md:max-h-none md:flex-row">
      {/* LEFT — question */}
      <div
        className="flex min-h-0 flex-1 flex-col p-5 md:w-[360px] md:flex-none md:border-r"
        style={{ borderColor: 'var(--mantine-color-default-border)' }}
      >
        <ModalHeader onClose={onClose} />

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel size="0.625rem">
              Question {step + 1} of {totalSteps}
            </SectionLabel>
            <Caption fw={800} tone="action">
              {progressPct}%
            </Caption>
          </div>
          <ProgressBar pct={progressPct} />
        </div>

        <Heading order={2} size="1.25rem" lh={1.25} mt="lg">
          {question.title}
        </Heading>
        <Caption component="p" mt={6} lh={1.5}>
          {question.helper}
        </Caption>

        <div className="mt-4 flex flex-col gap-2.5">
          {question.options.map((option) => (
            <OptionCard
              key={String(option.value)}
              selected={answers[question.key] === option.value}
              label={option.label}
              sub={option.sub}
              onClick={() => onChoose(option.value)}
            />
          ))}
        </div>

        <div className="flex-1" />
        {step > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-1.5 self-start py-1"
            style={{ color: 'var(--mantine-color-dimmed)' }}
          >
            <ChevronLeft size={16} />
            <Caption component="span" fw={600} c="inherit">
              Back
            </Caption>
          </button>
        ) : null}
      </div>

      {/* RIGHT — reassurance (desktop only) */}
      <div className="hidden min-h-0 flex-1 md:flex md:flex-col" style={{ backgroundColor: 'var(--vf-surface-2)' }}>
        <div className="flex h-full flex-col p-7">
          <SectionLabel>So far</SectionLabel>
          {RECAP_KEYS.some((key) => answers[key] != null) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {RECAP_KEYS.filter((key) => answers[key] != null).map((key) => (
                <span key={key} className="vf-chip" data-active="true">
                  <Caption component="span" fw={700} c="inherit">
                    {answerLabel(key, answers[key])}
                  </Caption>
                </span>
              ))}
            </div>
          ) : (
            <Text component="p" size="sm" tone="dimmed" fw={600} mt="sm" maw="22rem">
              Answer on the left and your picks show up here. We&apos;ll keep it to three quick questions.
            </Text>
          )}

          <div className="mt-auto">
            <Panel p="md">
              <Heading order={3} size="0.95rem" lh={1.2}>
                Whatever you pick, Sheetless handles the rest
              </Heading>
              <div className="mt-3.5 flex flex-col gap-3">
                <Reassurance icon={<Scale size={15} color="var(--vf-action-text)" />}>
                  Your starting weights, worked out for you
                </Reassurance>
                <Reassurance icon={<TrendingUp size={15} color="var(--vf-action-text)" />}>
                  When to add weight, every session
                </Reassurance>
                <Reassurance icon={<RefreshCw size={15} color="var(--vf-action-text)" />}>
                  A different plan anytime — nothing&apos;s locked in
                </Reassurance>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
