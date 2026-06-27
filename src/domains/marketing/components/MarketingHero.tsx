import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight, LogIn } from 'lucide-react'
import { Heading, SectionLabel, Text } from '~/components'
import { heroCopy } from '~/domains/marketing/lib/marketing-content'
import { HeroPreview } from './HeroPreview'

export function MarketingHero() {
  return (
    <section className="px-4 py-6 md:px-6 md:py-16">
      <div className="mx-auto grid max-w-[1180px] items-center gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(25rem,1.1fr)] lg:gap-10">
        <div className="min-w-0">
          <SectionLabel>Strength training without spreadsheet brain</SectionLabel>
          <Heading order={1} size="2.35rem" lh={1.05} mt="sm">
            {heroCopy.headline}
          </Heading>
          <Text component="p" size="md" tone="dimmed" fw={600} mt="md" maw="38rem">
            {heroCopy.subhead}
          </Text>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button component={Link} to="/auth" size="md">
              Get started
              <ArrowRight color="currentColor" size={17} />
            </Button>
            <Button component={Link} to="/auth" variant="default" size="md">
              <LogIn color="currentColor" size={17} />
              Sign in
            </Button>
          </div>
        </div>
        <HeroPreview />
      </div>
    </section>
  )
}
