import { Link } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { Box } from '@mantine/core'
import { BrandLockup, Caption, Heading, Panel, SectionLabel, Text } from '~/components'

const sidePanelChips = ['Est. 1RM 108 kg', 'Fatigue Fresh']
const sidePanelReceipt = [
  'Last time you hit 87.5 × 5 at RIR 1–2.',
  'So Sheetless added 2.5 kg today.',
]

/** Left cockpit panel — marketing preview shown next to the auth card on desktop. */
export function AuthSidePanel() {
  return (
    <Box
      component="section"
      bg="var(--vf-bg-elevated)"
      className="relative hidden overflow-hidden p-8 md:flex md:flex-col md:justify-between lg:p-12"
      style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}
    >
      <div className="vf-radial-glow absolute inset-0" style={{ ['--vf-glow-x' as string]: '12%' }} aria-hidden />
      <div className="vf-dot-grid absolute inset-0" aria-hidden />

      <div className="relative">
        <Link to="/" aria-label="Sheetless home" className="inline-flex w-fit">
          <BrandLockup size="md" />
        </Link>
      </div>

      <div className="relative max-w-md py-8">
        <SectionLabel>Training cockpit</SectionLabel>
        <Heading order={2} size="2.25rem" lh={1.07} mt="xs">
          Planned work, fast logging, clear progression.
        </Heading>
        <Text component="p" size="lg" tone="dimmed" fw={600} mt="md" maw="27rem">
          Sign in and pick up exactly where you left off — your plan, your loads, and your next decision
          are already waiting.
        </Text>

        <div className="vf-floaty mt-8 max-w-sm">
          <Panel p={0} className="overflow-hidden">
            <div
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <Heading order={3} size="0.95rem" lh={1.2}>
                Squat · Week 4
              </Heading>
              <span
                className="rounded-full px-2.5 py-1"
                style={{
                  backgroundColor: 'var(--vf-success-soft)',
                  border: '1px solid var(--vf-success-border)',
                }}
              >
                <Caption fw={800} tt="uppercase" tone="success">
                  On track
                </Caption>
              </span>
            </div>
            <div className="p-4">
              <SectionLabel>Next session</SectionLabel>
              <Heading order={3} size="1.6rem" lh={1.1} mt={3}>
                90 kg{' '}
                <Text component="span" inherit tone="dimmed">
                  × 5
                </Text>
              </Heading>
              <div className="mt-3 grid gap-2">
                {sidePanelReceipt.map((line) => (
                  <div key={line} className="flex gap-2.5">
                    <CheckCircle2 color="var(--vf-success-text)" size={16} className="mt-0.5 shrink-0" />
                    <Text component="p" size="sm" tone="dimmed" fw={600}>
                      {line}
                    </Text>
                  </div>
                ))}
              </div>
              <div
                className="mt-3 flex flex-wrap gap-2 pt-3"
                style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
              >
                {sidePanelChips.map((chip) => (
                  <span key={chip} className="vf-chip">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </Box>
  )
}
