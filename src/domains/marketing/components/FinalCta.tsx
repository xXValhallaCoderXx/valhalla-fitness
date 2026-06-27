import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Heading, Panel, SectionLabel, Text } from '~/components'

export function FinalCta() {
  return (
    <section className="px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto max-w-[1180px]">
        <Panel
          p="xl"
          style={{
            borderColor: 'var(--vf-action-border)',
            backgroundColor: 'var(--vf-action-soft)',
          }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <SectionLabel>Ready when you are</SectionLabel>
              <Heading order={2} size="2rem" lh={1.1} mt="xs">
                Start with the next workout, not a blank sheet.
              </Heading>
              <Text component="p" tone="dimmed" fw={600} mt="sm" maw="42rem">
                Create an account, pick a plan, and let Sheetless handle the progression math while you train.
              </Text>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button component={Link} to="/auth" size="md">
                Get started
                <ArrowRight color="currentColor" size={17} />
              </Button>
              <Button component={Link} to="/auth" variant="default" size="md">
                Sign in
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  )
}
