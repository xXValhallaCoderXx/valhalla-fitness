import { BarChart3, ClipboardList, Crosshair, History, Receipt, TrendingUp, type LucideIcon } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import {
  featuresFootnotes,
  marketingFeatures,
  type MarketingFeatureId,
} from '~/domains/marketing/lib/marketing-content'

const featureIcons: Record<MarketingFeatureId, LucideIcon> = {
  adaptive: TrendingUp,
  focus: Crosshair,
  previous: History,
  receipts: Receipt,
  history: BarChart3,
  plan: ClipboardList,
}

export function FeaturesGrid() {
  return (
    <section id="features" className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <SectionLabel>What Sheetless handles</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            Training decisions you can read at a glance.
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm">
            Keep the useful parts of serious programming without needing to manage every formula yourself.
          </Text>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {marketingFeatures.map((feature) => {
            const Icon = featureIcons[feature.id]
            return (
              <Panel key={feature.id} p="md" className="vf-card-hover h-full">
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
                  {feature.title}
                </Heading>
                <Text component="p" tone="dimmed" size="sm" fw={600} mt="xs">
                  {feature.body}
                </Text>
              </Panel>
            )
          })}
        </div>

        <div className="mt-6 grid gap-2">
          {featuresFootnotes.map((line) => (
            <Caption key={line} component="p" fw={600}>
              {line}
            </Caption>
          ))}
        </div>
      </div>
    </section>
  )
}

