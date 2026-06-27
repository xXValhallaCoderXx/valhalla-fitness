import { CheckCircle2, NotebookText } from 'lucide-react'
import { beginnerFriendlyPoints } from '~/domains/marketing/lib/marketing-content'
import { BrandMark, Caption, Heading, Panel, SectionLabel, Text } from '~/components'

export function BeginnerFriendly() {
  return (
    <section className="px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1.1fr)]">
        <div className="min-w-0">
          <SectionLabel>Beginner friendly, not watered down</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            Plain language first. Technical proof when you want it.
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm">
            Sheetless keeps the main decision visible: what to do next, and why. You can learn the details over
            time without needing them before your first session.
          </Text>
        </div>

        <Panel p="md">
          <div className="flex items-start gap-3">
            <BrandMark size="md" muted withBorder>
              <NotebookText color="var(--vf-action-text)" size={16} />
            </BrandMark>
            <div className="min-w-0">
              <SectionLabel>Training receipt</SectionLabel>
              <Heading order={3} size="1.1rem" mt={4}>
                Your plan reacts to the whole session.
              </Heading>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {beginnerFriendlyPoints.map((point) => (
              <div key={point} className="flex gap-3">
                <CheckCircle2 color="var(--vf-success-text)" size={18} className="mt-1 shrink-0" />
                <Text component="p" size="sm" tone="dimmed" fw={600}>
                  {point}
                </Text>
              </div>
            ))}
          </div>

          <Panel surface="inset" p="sm" className="mt-4">
            <Caption component="p" fw={800} tt="uppercase">
              Quiet proof
            </Caption>
            <Text component="p" size="sm" fw={800} mt={4}>
              RIR, estimated 1RM, fatigue tiers, and progression rules stay attached to the recommendation.
            </Text>
          </Panel>
        </Panel>
      </div>
    </section>
  )
}

