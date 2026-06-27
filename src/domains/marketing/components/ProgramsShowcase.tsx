import { CalendarDays, Layers3 } from 'lucide-react'
import { BrandMark, Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { programShowcaseGroups } from '~/domains/marketing/lib/marketing-content'

export function ProgramsShowcase() {
  return (
    <section className="px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-2xl">
          <SectionLabel>Built-in plans</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            Nine strength programs, grouped by where you are now.
          </Heading>
          <Text component="p" tone="dimmed" fw={600} mt="sm">
            Start simple, move into weekly structure, or run advanced waves without rebuilding the plan yourself.
          </Text>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {programShowcaseGroups.map((group) => (
            <Panel key={group.level} p="md" className="h-full">
              <div className="flex items-start gap-3">
                <BrandMark size="md" muted withBorder>
                  <Layers3 color="var(--vf-action-text)" size={16} />
                </BrandMark>
                <div className="min-w-0">
                  <SectionLabel>{group.level}</SectionLabel>
                  <Text component="p" tone="dimmed" size="sm" fw={600} mt={4}>
                    {group.description}
                  </Text>
                </div>
              </div>

              <div className="mt-4">
                {group.programs.map((program, index) => (
                  <div
                    key={program.name}
                    className="py-3"
                    style={{
                      borderTop: index === 0 ? undefined : '1px solid var(--mantine-color-default-border)',
                    }}
                  >
                    <Heading order={3} size="1rem" lh={1.2}>
                      {program.name}
                    </Heading>
                    <div className="mt-1 flex items-center gap-1.5">
                      <CalendarDays color="var(--mantine-color-dimmed)" size={13} />
                      <Caption fw={700}>{program.meta}</Caption>
                    </div>
                    <Text component="p" tone="dimmed" size="sm" fw={600} mt="xs">
                      {program.summary}
                    </Text>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </section>
  )
}

