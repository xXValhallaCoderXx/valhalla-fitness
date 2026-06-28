import { useState } from 'react'
import { Check, Crosshair, Hand, History, ListChecks, Sparkles, type LucideIcon } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { focusDemoBullets, focusDemoCopy } from '~/domains/marketing/lib/marketing-content'
import {
  firstActiveFocusDemoIndex,
  focusDemoRirOptions,
  initialFocusDemoSets,
  pickFocusDemoRir,
  summarizeFocusDemo,
  toggleFocusDemoSet,
} from '~/domains/marketing/lib/focus-demo'

const bulletIcons: LucideIcon[] = [Check, Crosshair, Sparkles]

const fig = { load: '87.5 kg', weight: '87.5', target: '87.5 × 5' }

const colStyle = {
  display: 'grid',
  gridTemplateColumns: '1.5rem minmax(3.25rem, 1fr) 2.5rem 3.5rem auto 2.25rem',
  gap: '0.5rem',
  alignItems: 'center',
} as const

export function FocusModeDemo() {
  const [sets, setSets] = useState(initialFocusDemoSets)
  const activeIndex = firstActiveFocusDemoIndex(sets)
  const { donePct, doneLabel } = summarizeFocusDemo(sets)

  return (
    <section className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto grid max-w-[1180px] items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
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
                    style={{
                      backgroundColor: 'var(--vf-action-soft)',
                      border: '1px solid var(--vf-action-border)',
                    }}
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

        {/* Interactive logging card */}
        <Panel p={0} className="overflow-hidden">
          <div
            className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Heading order={3} size="1.2rem" lh={1.1}>
                  Squat
                </Heading>
                <span className="vf-chip" data-active="true">
                  MAIN
                </span>
              </div>
              <Caption fw={600} mt={4}>
                5×5 @ current working load · Beginner 5×5 Linear
              </Caption>
            </div>
            <div className="flex gap-2">
              <span className="vf-chip">
                <ListChecks size={13} /> Plates
              </span>
              <span className="vf-chip">
                <History size={13} /> History
              </span>
            </div>
          </div>

          <div
            className="flex flex-wrap items-end justify-between gap-4 px-5 py-3.5"
            style={{
              backgroundColor: 'var(--vf-surface-2)',
              borderBottom: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <div>
              <SectionLabel>Top set today</SectionLabel>
              <Heading order={4} size="1.4rem" lh={1.1} mt={2}>
                {fig.load}{' '}
                <Text component="span" inherit tone="dimmed" size="0.9rem">
                  × 5
                </Text>
              </Heading>
            </div>
            <div className="text-right">
              <SectionLabel>Last comparable</SectionLabel>
              <Caption fw={600} mt={2}>
                No previous comparable
              </Caption>
            </div>
          </div>

          <div
            className="px-5 py-2.5"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Text component="p" tone="dimmed" size="xs" fw={600}>
              <b style={{ color: 'var(--mantine-color-text)' }}>Progression hint:</b> the top set is the key
              set. Clean reps with honest RIR support a stronger next call.
            </Text>
          </div>

          <div className="px-4 py-4">
            <div className="overflow-x-auto">
              <div style={{ minWidth: '24.5rem' }}>
                <div
                  className="px-2.5 pb-2"
                  style={{ ...colStyle, color: 'var(--mantine-color-dimmed)' }}
                >
                  <Caption fw={800} tt="uppercase">
                    #
                  </Caption>
                  <Caption fw={800} tt="uppercase">
                    Weight
                  </Caption>
                  <Caption fw={800} tt="uppercase" ta="center">
                    Reps
                  </Caption>
                  <Caption fw={800} tt="uppercase">
                    Target
                  </Caption>
                  <Caption fw={800} tt="uppercase" ta="center">
                    RIR
                  </Caption>
                  <span />
                </div>

                <div className="flex flex-col gap-2">
                  {sets.map((set, index) => {
                    const active = index === activeIndex
                    const borderColor = set.done
                      ? 'var(--vf-success-border)'
                      : active
                        ? 'var(--vf-action-border)'
                        : 'var(--mantine-color-default-border)'
                    const bg = set.done
                      ? 'var(--vf-success-soft)'
                      : active
                        ? 'var(--vf-action-soft)'
                        : 'var(--mantine-color-default)'
                    return (
                      <div
                        key={index}
                        className="rounded-xl px-2.5 py-2"
                        style={{ ...colStyle, border: `1px solid ${borderColor}`, backgroundColor: bg }}
                      >
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-md"
                          style={{
                            backgroundColor: set.done ? 'var(--vf-success-soft)' : 'var(--vf-surface-2)',
                            color: set.done ? 'var(--vf-success-text)' : 'var(--mantine-color-dimmed)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {index + 1}
                        </div>
                        <div
                          className="rounded-lg px-2.5 py-1.5 text-center"
                          style={{
                            border: '1px solid var(--mantine-color-default-border)',
                            backgroundColor: 'var(--mantine-color-default)',
                            fontWeight: 700,
                          }}
                        >
                          {fig.weight}
                        </div>
                        <div
                          className="rounded-lg px-1.5 py-1.5 text-center"
                          style={{
                            border: '1px solid var(--mantine-color-default-border)',
                            backgroundColor: 'var(--mantine-color-default)',
                            fontWeight: 700,
                          }}
                        >
                          5
                        </div>
                        <Caption fw={600}>{fig.target}</Caption>
                        <div className="flex justify-end gap-1.5">
                          {focusDemoRirOptions.map((value) => {
                            const selected = set.rir === value
                            return (
                              <button
                                key={value}
                                type="button"
                                aria-label={`Set ${index + 1} RIR ${value === 3 ? '3+' : value}`}
                                aria-pressed={selected}
                                onClick={() => setSets((prev) => pickFocusDemoRir(prev, index, value))}
                                className="flex h-7 min-w-7 items-center justify-center rounded-md transition-colors"
                                style={{
                                  border: `1px solid ${selected ? 'var(--vf-action-text)' : 'var(--mantine-color-default-border)'}`,
                                  backgroundColor: selected ? 'var(--vf-action-text)' : 'var(--mantine-color-default)',
                                  color: selected ? 'var(--mantine-color-white)' : 'var(--mantine-color-dimmed)',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                }}
                              >
                                {value === 3 ? '3+' : value}
                              </button>
                            )
                          })}
                        </div>
                        <button
                          type="button"
                          aria-label={`Toggle set ${index + 1} complete`}
                          aria-pressed={set.done}
                          onClick={() => setSets((prev) => toggleFocusDemoSet(prev, index))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          style={{
                            border: `1px solid ${set.done ? 'var(--vf-success-text)' : 'var(--mantine-color-default-border)'}`,
                            backgroundColor: set.done ? 'var(--vf-success-text)' : 'var(--mantine-color-default)',
                            color: set.done ? 'var(--mantine-color-white)' : 'var(--mantine-color-dimmed)',
                          }}
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--vf-surface-3)' }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${donePct}%`, backgroundColor: 'var(--vf-action-text)' }}
                />
              </div>
              <Caption fw={800} tone="action" className="whitespace-nowrap">
                {doneLabel}
              </Caption>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  )
}
