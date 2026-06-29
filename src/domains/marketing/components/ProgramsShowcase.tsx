import { Button } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { CalendarDays, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { FindMyPlanModal } from '~/domains/program/components/FindMyPlanModal'
import { templatesQueryOptions } from '~/domains/program/queries'
import {
  programLevelColor,
  programShowcaseCards,
  programShowcaseGroups,
} from '~/domains/marketing/lib/marketing-content'

export function ProgramsShowcase() {
  const router = useRouter()
  const [showFinder, setShowFinder] = useState(false)
  // Templates are public (listTemplatesFn needs no auth), so logged-out visitors can take the
  // quiz right here. Prefetch on hover/focus so the recommendation is ready on open, without
  // loading templates for visitors who never touch the quiz.
  const [armed, setArmed] = useState(false)
  const templatesQuery = useQuery({ ...templatesQueryOptions(), enabled: armed })
  const quizTemplates = (templatesQuery.data ?? []).filter((template) => template.origin !== 'user_created')
  const arm = () => setArmed(true)
  const openFinder = () => {
    setArmed(true)
    setShowFinder(true)
  }

  return (
    <section id="programs" className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <SectionLabel>Built-in programs</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            Real plans. Clear rules.
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm">
            Start with a simple progression model or move into percentage waves, volume-intensity blocks, and
            powerbuilding structure. Every plan keeps the rules visible.
          </Text>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {programShowcaseGroups.map((group) => (
            <div key={group.level} className="flex gap-2.5">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: programLevelColor[group.level] }}
              />
              <div className="min-w-0">
                <Text component="p" fw={700} size="sm">
                  {group.level}
                </Text>
                <Text component="p" tone="dimmed" size="sm" fw={600} mt={2}>
                  {group.description}
                </Text>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programShowcaseCards.map((program) => (
            <Panel key={program.name} p={0} className="vf-card-hover h-full overflow-hidden">
              <div className="h-1" style={{ backgroundColor: programLevelColor[program.level] }} />
              <div className="p-4">
                <Caption fw={800} tt="uppercase" style={{ color: programLevelColor[program.level] }}>
                  {program.level}
                </Caption>
                <Heading order={3} size="1.05rem" lh={1.2} mt={6}>
                  {program.name}
                </Heading>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <CalendarDays color="var(--mantine-color-dimmed)" size={13} />
                  <Caption fw={700}>{program.meta}</Caption>
                </div>
                <Text component="p" tone="dimmed" size="sm" fw={600} mt="xs">
                  {program.summary}
                </Text>
              </div>
            </Panel>
          ))}
        </div>

        {/* "There's more" + centered Find-my-plan CTA, below the three cards. */}
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <Caption component="p" maw="34rem">
            Three of the built-in plans — the full library runs from simple linear progression to advanced waves.
          </Caption>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={openFinder} onMouseEnter={arm} onFocus={arm}>
              <Sparkles size={16} />
              Find my plan
            </Button>
          </div>
        </div>
      </div>

      <FindMyPlanModal
        opened={showFinder}
        onClose={() => setShowFinder(false)}
        templates={quizTemplates}
        onStart={() => {
          // Logged-out visitors need an account to start a plan — funnel them to sign-up.
          setShowFinder(false)
          void router.navigate({ to: '/auth' })
        }}
      />
    </section>
  )
}
