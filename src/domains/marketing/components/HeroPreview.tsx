import { Box } from '@mantine/core'
import { Activity, BarChart3, CheckCircle2, ClipboardCheck, Dumbbell, Timer } from 'lucide-react'
import { BrandMark, Caption, Heading, Panel, SectionLabel, StatCard, StatValue, Text } from '~/components'

const focusSets = [
  { label: 'Load', value: '185 lb' },
  { label: 'Reps', value: '5 / 5' },
  { label: 'RIR', value: '2' },
]

export function HeroPreview() {
  return (
    <Panel p="md" className="mx-auto w-full max-w-[34rem]" style={{ borderColor: 'var(--vf-action-border)' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark size="md" muted withBorder>
            <Dumbbell color="currentColor" size={16} />
          </BrandMark>
          <div className="min-w-0">
            <SectionLabel>Today</SectionLabel>
            <Heading order={3} size="1rem" lh={1.1}>
              Squat focus
            </Heading>
          </div>
        </div>
        <Caption fw={800}>Week 4</Caption>
      </div>

      <Panel surface="inset" p="sm" className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SectionLabel>Focus mode</SectionLabel>
            <Text component="p" fw={800} mt={2}>
              Set 3 of 5
            </Text>
          </div>
          <BrandMark size="sm" muted withBorder>
            <Timer color="currentColor" size={14} />
          </BrandMark>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {focusSets.map((item) => (
            <Box
              key={item.label}
              p="xs"
              bg="var(--mantine-color-default)"
              className="min-w-0"
              style={{
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 'var(--mantine-radius-md)',
              }}
            >
              <Caption fw={800} tt="uppercase">
                {item.label}
              </Caption>
              <StatValue size="1.05rem" truncate>
                {item.value}
              </StatValue>
            </Box>
          ))}
        </div>
      </Panel>

      <Panel
        surface="inset"
        p="sm"
        className="mt-3"
        style={{
          borderColor: 'var(--vf-success-border)',
          backgroundColor: 'var(--vf-success-soft)',
        }}
      >
        <div className="flex gap-3">
          <CheckCircle2 color="var(--vf-success-text)" size={18} className="mt-1 shrink-0" />
          <div className="min-w-0">
            <SectionLabel>Coaching receipt</SectionLabel>
            <Text component="p" fw={800} mt={3}>
              You beat the target with good effort.
            </Text>
            <Caption component="p" mt={4}>
              Next squat session moves from 185 to 190 lb. If effort climbs, Sheetless will hold instead.
            </Caption>
          </div>
        </div>
      </Panel>

      <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-2">
        <StatCard
          label="Est. 1RM"
          value="238 lb"
          icon={<BarChart3 color="var(--mantine-color-dimmed)" size={15} />}
          tone="success"
        />
        <StatCard
          label="Muscle fatigue"
          value="Light"
          icon={<Activity color="var(--mantine-color-dimmed)" size={15} />}
          tone="action"
        />
      </div>

      <div className="hidden sm:block">
        <Panel surface="inset" p="sm" className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <SectionLabel>Next decision</SectionLabel>
              <Text component="p" size="sm" fw={800} truncate>
                Add weight if all work stays at RIR 1-3
              </Text>
            </div>
            <ClipboardCheck color="var(--vf-action-text)" size={18} className="shrink-0" />
          </div>
        </Panel>
      </div>
    </Panel>
  )
}
