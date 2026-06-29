import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check } from 'lucide-react'
import { Caption, Heading, Text } from '~/components'
import { heroCopy } from '~/domains/marketing/lib/marketing-content'
import { HeroPreview } from './HeroPreview'

export function MarketingHero() {
  return (
    <section id="top" className="relative overflow-hidden px-4 py-10 md:px-6 md:py-20">
      <div className="vf-radial-glow absolute inset-0" aria-hidden />
      <div className="vf-dot-grid absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid max-w-[1180px] items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,1.05fr)] lg:gap-12">
        <div className="min-w-0">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 md:gap-2 md:px-3 md:py-1.5"
            style={{
              border: '1px solid var(--vf-action-border)',
              backgroundColor: 'var(--vf-action-soft)',
            }}
          >
            <span
              className="h-1 w-1 shrink-0 rounded-full md:h-1.5 md:w-1.5"
              style={{ backgroundColor: 'var(--vf-action-text)' }}
            />
            <Caption
              fw={800}
              tt="uppercase"
              tone="action"
              style={{ letterSpacing: '0.08em', fontSize: 'clamp(0.5625rem, 1.7vw, 0.6875rem)' }}
            >
              {heroCopy.eyebrow}
            </Caption>
          </div>

          <Heading
            order={1}
            size="2.6rem"
            lh={1.03}
            mt="md"
            aria-label={`${heroCopy.headline} ${heroCopy.headlineAccent}`}
          >
            {heroCopy.headline}
            <br />
            <Text component="span" inherit tone="action">
              {heroCopy.headlineAccent}
            </Text>
          </Heading>

          <Text component="p" size="lg" tone="dimmed" fw={600} mt="md" maw="34rem">
            {heroCopy.subhead}
          </Text>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button component={Link} to="/auth" size="md">
              Get started — it's free
              <ArrowRight color="currentColor" size={17} />
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
            {heroCopy.highlights.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <Check color="var(--vf-action-text)" size={16} className="shrink-0" />
                <Text component="span" size="sm" tone="dimmed" fw={600}>
                  {item}
                </Text>
              </span>
            ))}
          </div>
        </div>

        <div className="vf-floaty">
          <HeroPreview />
        </div>
      </div>
    </section>
  )
}
