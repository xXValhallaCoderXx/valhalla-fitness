import { X } from 'lucide-react'
import { Caption, Heading, SectionLabel, Text } from '~/components'
import { philosophyCopy } from '~/domains/marketing/lib/marketing-content'

export function PhilosophyBand() {
  return (
    <section className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <SectionLabel>{philosophyCopy.eyebrow}</SectionLabel>
        <Heading order={2} size="2rem" lh={1.1} mt="xs">
          {philosophyCopy.heading}
        </Heading>
        <Text component="p" size="lg" tone="dimmed" fw={600} mt="md" className="mx-auto" maw="42rem">
          {philosophyCopy.body1}
        </Text>
        <Text component="p" tone="dimmed" fw={600} mt="sm" className="mx-auto" maw="42rem">
          {philosophyCopy.body2}
        </Text>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {philosophyCopy.chips.map((chip) => (
            <span key={chip} className="vf-chip">
              <X color="var(--vf-danger-text)" size={13} className="shrink-0" />
              <Caption fw={700} component="span">
                {chip}
              </Caption>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
