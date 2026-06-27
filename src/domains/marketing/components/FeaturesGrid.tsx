import { Activity, BarChart3, ClipboardList, Crosshair, Gauge, TrendingUp, type LucideIcon } from 'lucide-react'
import { BrandMark, Heading, Panel, SectionLabel, Text } from '~/components'
import {
  marketingFeatures,
  type MarketingFeatureId,
} from '~/domains/marketing/lib/marketing-content'

const featureIcons: Record<MarketingFeatureId, LucideIcon> = {
  adaptive: TrendingUp,
  focus: Crosshair,
  plan: ClipboardList,
  metrics: Gauge,
  fatigue: Activity,
  records: BarChart3,
}

export function FeaturesGrid() {
  return (
    <section className="px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <SectionLabel>What Sheetless handles</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            Training decisions you can read at a glance.
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm">
            Keep the useful parts of a serious program without needing to understand every formula on day one.
          </Text>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {marketingFeatures.map((feature) => {
            const Icon = featureIcons[feature.id]
            return (
              <Panel key={feature.id} p="md" className="h-full">
                <BrandMark size="md" muted withBorder>
                  <Icon color="var(--vf-action-text)" size={16} />
                </BrandMark>
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
      </div>
    </section>
  )
}

