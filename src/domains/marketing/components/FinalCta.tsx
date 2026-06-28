import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'

export function FinalCta() {
  return (
    <section id="start" className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-[1000px]">
        <Panel
          className="relative overflow-hidden"
          p="xl"
          style={{ borderColor: 'var(--vf-action-border)' }}
        >
          <div
            className="vf-radial-glow absolute inset-0"
            style={{ ['--vf-glow-x' as string]: '50%' }}
            aria-hidden
          />
          <div className="vf-dot-grid absolute inset-0" aria-hidden />

          <div className="relative mx-auto max-w-xl py-4 text-center md:py-8">
            <SectionLabel tone="action">Ready when you are</SectionLabel>
            <Heading order={2} size="2.2rem" lh={1.06} mt="xs">
              Start with the next workout, not a blank sheet.
            </Heading>
            <Text component="p" tone="dimmed" fw={600} mt="sm" className="mx-auto" maw="30rem">
              Create an account, pick a plan, and let Sheetless handle the progression math while you train.
            </Text>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button component={Link} to="/auth" size="md">
                Get started — it's free
                <ArrowRight color="currentColor" size={17} />
              </Button>
              <Button component={Link} to="/auth" variant="default" size="md">
                Sign in
              </Button>
            </div>
            <Caption fw={600} mt="md">
              No spreadsheet, no credit card — just your next session.
            </Caption>
          </div>
        </Panel>
      </div>
    </section>
  )
}
