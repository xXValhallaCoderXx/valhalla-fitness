import { ArrowRight, ClipboardCheck, Dumbbell, Sparkles } from 'lucide-react'
import { BrandMark, Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { howItWorksSteps } from '~/domains/marketing/lib/marketing-content'

const stepIcons = [Dumbbell, ClipboardCheck, Sparkles]

export function HowItWorks() {
  return (
    <section className="px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <SectionLabel>How it works</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            Load. Log. Adapt.
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm">
            The loop stays simple, even when the program logic gets more advanced.
          </Text>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {howItWorksSteps.map((step, index) => {
            const Icon = stepIcons[index]
            return (
              <Panel key={step.label} p="md" className="h-full">
                <div className="flex items-center justify-between gap-3">
                  <BrandMark size="md" muted withBorder>
                    <Icon color="var(--vf-action-text)" size={16} />
                  </BrandMark>
                  {index < howItWorksSteps.length - 1 ? (
                    <ArrowRight color="var(--mantine-color-dimmed)" size={18} />
                  ) : null}
                </div>
                <Caption component="p" fw={800} tt="uppercase" mt="md">
                  {step.label}
                </Caption>
                <Heading order={3} size="1.1rem" mt={4}>
                  {step.title}
                </Heading>
                <Text component="p" tone="dimmed" size="sm" fw={600} mt="xs">
                  {step.body}
                </Text>
              </Panel>
            )
          })}
        </div>
      </div>
    </section>
  )
}

