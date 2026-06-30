import { Button, Transition } from '@mantine/core'
import { Check, Crosshair, Hand, Minus, RotateCcw, Sparkles, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { FocusExerciseHeader } from '~/domains/session/components/FocusExerciseHeader'
import { FocusRirRow } from '~/domains/session/components/FocusRirRow'
import { FocusSetProgressBar } from '~/domains/session/components/FocusSetProgressBar'
import { FocusStepper } from '~/domains/session/components/FocusStepper'
import { firstActionableSetIndex, nextIncompleteSetIndex } from '~/domains/session/components/live-focus-utils'
import { formatSetTarget, roundToStep } from '~/domains/session/components/live-session-utils'
import { focusDemoBullets, focusDemoCopy } from '~/domains/marketing/lib/marketing-content'
import {
  createFocusDemoMovement,
  focusDemoDraftFor,
  focusDemoProgression,
  logFocusDemoSet,
  FOCUS_DEMO_ROUNDING,
  FOCUS_DEMO_SET_TOTAL,
  FOCUS_DEMO_TARGET_LOAD,
  type FocusDemoDraft,
  type FocusDemoOutcome,
} from '~/domains/marketing/lib/focus-demo'

const bulletIcons: LucideIcon[] = [Check, Crosshair, Sparkles]

/** Accent + icon per progression outcome for the result sheet. Colors are existing vf tokens. */
const outcomeTone: Record<FocusDemoOutcome, { color: string; Icon: LucideIcon }> = {
  increase: { color: 'var(--vf-success-text)', Icon: TrendingUp },
  hold: { color: 'var(--vf-action-text)', Icon: Minus },
  decrease: { color: 'var(--vf-warning-text)', Icon: TrendingDown },
}

function initialFocusDemoState() {
  const movement = createFocusDemoMovement()
  const selectedIndex = firstActionableSetIndex(movement)
  return { movement, selectedIndex, draft: focusDemoDraftFor(movement, selectedIndex) }
}

export function FocusModeDemo() {
  // The demo renders the real Focus components against a self-contained mock movement — no session,
  // no network. Logging a set marks it complete locally and advances to the next, like the live logger.
  const [state, setState] = useState(initialFocusDemoState)
  const { movement, selectedIndex, draft } = state
  const activeSet = movement.sets.find((set) => set.setIndex === selectedIndex) ?? movement.sets[0]

  // When every set is logged, the session is "done": all bars light up and the coach's call slides up.
  const allComplete = movement.sets.every((set) => set.completed)
  const finalRir = movement.sets.at(-1)?.actualRir
  const result = allComplete ? focusDemoProgression(FOCUS_DEMO_TARGET_LOAD, finalRir) : null
  const tone = outcomeTone[result?.outcome ?? 'hold']
  const ToneIcon = tone.Icon

  const selectSet = (setIndex: number) =>
    setState((current) => ({ ...current, selectedIndex: setIndex, draft: focusDemoDraftFor(current.movement, setIndex) }))
  const patchDraft = (patch: Partial<FocusDemoDraft>) =>
    setState((current) => ({ ...current, draft: { ...current.draft, ...patch } }))
  const adjustLoad = (delta: number) =>
    setState((current) => ({
      ...current,
      draft: { ...current.draft, load: Math.max(0, roundToStep(current.draft.load + delta, FOCUS_DEMO_ROUNDING)) },
    }))
  const adjustReps = (delta: number) =>
    setState((current) => ({ ...current, draft: { ...current.draft, reps: Math.max(0, current.draft.reps + delta) } }))
  const logSet = () =>
    setState((current) => {
      const next = logFocusDemoSet(current.movement, current.selectedIndex, current.draft)
      const nextIndex = nextIncompleteSetIndex(next, current.selectedIndex) ?? firstActionableSetIndex(next)
      return { movement: next, selectedIndex: nextIndex, draft: focusDemoDraftFor(next, nextIndex) }
    })
  const resetDemo = () => setState(initialFocusDemoState())

  return (
    <section className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto grid max-w-[1180px] items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
        {/* Copy */}
        <div className="min-w-0">
          <SectionLabel>{focusDemoCopy.eyebrow}</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            {focusDemoCopy.heading}
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm">
            {focusDemoCopy.subhead}
          </Text>

          <div className="mt-6 grid gap-4">
            {focusDemoBullets.map((bullet, index) => {
              const Icon = bulletIcons[index]
              return (
                <div key={bullet.title} className="flex gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
                  >
                    <Icon color="var(--vf-action-text)" size={18} />
                  </div>
                  <div className="min-w-0">
                    <Text component="p" fw={700}>
                      {bullet.title}
                    </Text>
                    <Text component="p" tone="dimmed" size="sm" fw={600} mt={2}>
                      {bullet.body}
                    </Text>
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="mt-6 inline-flex items-center gap-2 rounded-full px-3.5 py-2"
            style={{ border: '1px dashed var(--vf-action-border)' }}
          >
            <Hand color="var(--vf-action-text)" size={15} />
            <Caption fw={700} tone="action">
              {focusDemoCopy.hint}
            </Caption>
          </div>
        </div>

        {/* The real Focus logger, driven by local demo state */}
        <Panel p={0} className="relative overflow-hidden">
          <div className="space-y-4 p-4 md:p-5">
            {/* Header + set progress stay crisp above the result scrim so all five lit bars are visible. */}
            <div className="relative z-30 space-y-4">
              <FocusExerciseHeader
                movement={movement}
                hasPrev={false}
                hasNext={false}
                onPrev={() => {}}
                onNext={() => {}}
                onOpenHistory={() => {}}
              />

              <FocusSetProgressBar
                movement={movement}
                selectedSetIndex={allComplete ? -1 : selectedIndex}
                onSelectSet={allComplete ? () => {} : selectSet}
              />
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{
                borderColor: 'var(--vf-action-border)',
                backgroundColor: 'var(--mantine-color-default)',
                boxShadow: 'var(--vf-shadow-card)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <SectionLabel>
                  Current · Set {selectedIndex} of {FOCUS_DEMO_SET_TOTAL}
                </SectionLabel>
                <Caption>Target {formatSetTarget(activeSet, 'kg')}</Caption>
              </div>

              <div className="mt-3 space-y-3">
                <FocusStepper
                  label="Weight"
                  unitSuffix="kg"
                  value={draft.load}
                  step={FOCUS_DEMO_ROUNDING}
                  onAdjust={adjustLoad}
                  onType={(value) => patchDraft({ load: value })}
                />
                <FocusStepper
                  label="Reps"
                  value={draft.reps}
                  step={1}
                  onAdjust={adjustReps}
                  onType={(value) => patchDraft({ reps: Math.max(0, value) })}
                />
                <FocusRirRow value={draft.rir} onChange={(value) => patchDraft({ rir: value })} />

                <Button fullWidth size="lg" radius="lg" onClick={logSet}>
                  <Check size={18} />
                  {activeSet.completed ? 'Update set' : 'Log set'}
                </Button>
              </div>
            </div>
          </div>

          {/* Soft scrim over the logger when the session is done (the lit progress bar shows through). */}
          <Transition mounted={allComplete} transition="fade" duration={160}>
            {(styles) => (
              <button
                type="button"
                aria-label="Dismiss and run the demo again"
                onClick={resetDemo}
                className="absolute inset-0 z-10 cursor-pointer"
                style={{ ...styles, backgroundColor: 'color-mix(in srgb, var(--mantine-color-body) 55%, transparent)' }}
              />
            )}
          </Transition>

          {/* The progression "coach's call" bottom sheet, slid up from the panel floor. */}
          <Transition mounted={allComplete} transition="slide-up" duration={260} timingFunction="ease">
            {(styles) => (
              <div
                role="dialog"
                aria-label="Progression result"
                className="absolute inset-x-0 bottom-0 z-20 rounded-t-2xl border-t p-5"
                style={{
                  ...styles,
                  backgroundColor: 'var(--mantine-color-body)',
                  borderColor: 'var(--vf-action-border)',
                  boxShadow: 'var(--vf-shadow-card)',
                }}
              >
                {result && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${tone.color} 14%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${tone.color} 35%, transparent)`,
                        }}
                      >
                        <ToneIcon color={tone.color} size={20} />
                      </div>
                      <div className="min-w-0">
                        <Caption fw={800} tt="uppercase" style={{ color: tone.color, letterSpacing: '0.04em' }}>
                          {result.eyebrow}
                        </Caption>
                        <Heading order={3} size="1.3rem" lh={1.15}>
                          {result.title}
                        </Heading>
                      </div>
                    </div>
                    <Text component="p" size="sm" tone="dimmed" fw={600}>
                      {result.body}
                    </Text>
                    <Button fullWidth variant="default" radius="lg" onClick={resetDemo}>
                      <RotateCcw size={16} />
                      Run the demo again
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Transition>
        </Panel>
      </div>
    </section>
  )
}
