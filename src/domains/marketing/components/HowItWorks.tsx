import { BookOpen, ClipboardCheck, Dumbbell, type LucideIcon } from 'lucide-react'
import { Heading, Panel, SectionLabel, Text } from '~/components'
import { howItWorksCopy, howItWorksSteps } from '~/domains/marketing/lib/marketing-content'
import { ReceiptCard } from './CoachingReceipt'

const stepIcons: LucideIcon[] = [Dumbbell, ClipboardCheck, BookOpen]

export function HowItWorks() {
  return (
    <section id="how" className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <SectionLabel>{howItWorksCopy.eyebrow}</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            {howItWorksCopy.heading}
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm">
            {howItWorksCopy.subhead}
          </Text>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-10">
          <div className="grid gap-3 sm:grid-cols-3">
            {howItWorksSteps.map((step, index) => {
              const Icon = stepIcons[index]
              return (
                <Panel key={step.title} p="md" className="relative h-full overflow-hidden">
                  <Text
                    component="span"
                    aria-hidden
                    fw={800}
                    className="pointer-events-none absolute right-5 top-3 select-none"
                    style={{
                      fontSize: '3.75rem',
                      lineHeight: 1,
                      letterSpacing: '-0.04em',
                      color: 'color-mix(in srgb, var(--mantine-color-text) 6%, transparent)',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: 'var(--vf-action-soft)',
                      border: '1px solid var(--vf-action-border)',
                    }}
                  >
                    <Icon color="var(--vf-action-text)" size={20} />
                  </div>
                  <Heading order={3} size="1.1rem" mt="md">
                    {step.title}
                  </Heading>
                  <Text component="p" tone="dimmed" size="sm" fw={600} mt="xs">
                    {step.body}
                  </Text>
                </Panel>
              )
            })}
          </div>

          <ReceiptCard />
        </div>
      </div>
    </section>
  )
}
