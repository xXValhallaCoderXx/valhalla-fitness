import { Eye, ReceiptText, Scale, type LucideIcon } from 'lucide-react'
import { Heading, Panel, SectionLabel, Text } from '~/components'
import { noBlackBoxCopy, noBlackBoxPoints } from '~/domains/marketing/lib/marketing-content'

const pointIcons: LucideIcon[] = [Scale, ReceiptText, Eye]

export function NoBlackBox() {
  return (
    <section id="no-black-box" className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <SectionLabel>{noBlackBoxCopy.eyebrow}</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            {noBlackBoxCopy.heading}
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm">
            {noBlackBoxCopy.subhead}
          </Text>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {noBlackBoxPoints.map((point, index) => {
            const Icon = pointIcons[index]
            return (
              <Panel key={point.title} p="md" className="vf-card-hover h-full">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: 'var(--vf-action-soft)',
                    border: '1px solid var(--vf-action-border)',
                  }}
                >
                  <Icon color="var(--vf-action-text)" size={20} />
                </div>
                <Heading order={3} size="1.05rem" mt="md">
                  {point.title}
                </Heading>
                <Text component="p" tone="dimmed" size="sm" fw={600} mt="xs">
                  {point.body}
                </Text>
              </Panel>
            )
          })}
        </div>
      </div>
    </section>
  )
}
