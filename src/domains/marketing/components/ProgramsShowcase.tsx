import { Link } from '@tanstack/react-router'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import {
  programLevelColor,
  programShowcaseCards,
  programShowcaseGroups,
} from '~/domains/marketing/lib/marketing-content'

export function ProgramsShowcase() {
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

          <Link
            to="/auth"
            className="vf-card-hover flex flex-col items-center justify-center rounded-[var(--mantine-radius-lg)] p-5 text-center"
            style={{
              minHeight: '8rem',
              border: '1px dashed var(--vf-action-border)',
              backgroundColor: 'var(--vf-action-soft)',
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--mantine-color-default)', border: '1px solid var(--vf-action-border)' }}
            >
              <ArrowRight color="var(--vf-action-text)" size={19} />
            </div>
            <Text component="p" fw={700} mt="sm">
              Browse all plans
            </Text>
            <Caption fw={600} mt={2}>
              Or take the Find My Plan quiz
            </Caption>
          </Link>
        </div>
      </div>
    </section>
  )
}
