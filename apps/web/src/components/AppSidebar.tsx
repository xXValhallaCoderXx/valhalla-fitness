import { Box } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { experienceModeLabels } from '@sheetless/domain/account/experience-mode'
import { programmeWeekIndex } from '@sheetless/domain/program/program-phase-map'
import { BrandLockup, Caption, Panel, SectionLabel, Text } from '~/components'
import { useAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { useExperienceMode } from '~/domains/account/components'
import { activeProgramQueryOptions } from '~/domains/program/queries'
import type { BottomNavSection } from './molecules/app-navigation'

const NAV_LABEL_SIZE = '0.90625rem'

export type SidebarNavItem = {
  to: BottomNavSection | '/settings'
  label: string
  icon: LucideIcon
  tour?: string
}

/**
 * Desktop navigation rail. Introduced at `lg` rather than `md` on purpose: the shell's geometry
 * spec exercises the 820px tablet width, where the top pill nav still owns navigation.
 */
export function AppSidebar({
  items,
  activeSection,
}: {
  items: readonly SidebarNavItem[]
  activeSection: BottomNavSection | null
}) {
  return (
    <Box
      component="nav"
      aria-label="Main"
      data-testid="app-sidebar"
      className="vf-app-sidebar hidden shrink-0 flex-col lg:flex"
      bg="var(--vf-bg-elevated)"
      style={{ borderRight: '1px solid var(--vf-card-border)' }}
    >
      <Link to="/today" aria-label="Sheetless home" className="block px-2 pb-7">
        <BrandLockup size="md" />
      </Link>

      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <SidebarLink
            key={item.to}
            item={{ ...item, tour: `snav-${item.to.slice(1)}` }}
            active={activeSection === item.to}
          />
        ))}
      </div>

      <div className="flex-1" />

      <ActiveProgrammeCard />

      <SidebarLink item={{ to: '/settings', label: 'Settings', icon: Settings }} active={false} />
      <ModeRow />
    </Box>
  )
}

function SidebarLink({ item, active }: { item: SidebarNavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Box
      component={Link}
      to={item.to}
      data-tour={item.tour}
      aria-current={active ? 'page' : undefined}
      className="flex items-center gap-3 rounded-[0.625rem] px-3"
      bg={active ? 'var(--vf-action-soft)' : 'transparent'}
      style={{ height: '2.75rem', color: active ? 'var(--vf-action-text)' : 'var(--mantine-color-text)' }}
    >
      <Icon size={20} />
      <Text component="span" size={NAV_LABEL_SIZE} fw={active ? 700 : 500} c="inherit" truncate>
        {item.label}
      </Text>
    </Box>
  )
}

/** The programme the numbers on every screen are computed from — context, not navigation. */
function ActiveProgrammeCard() {
  const userId = useAccountId()
  const { data: program } = useQuery({
    ...activeProgramQueryOptions(userId ?? ''),
    enabled: Boolean(userId),
  })
  if (!program) return null

  const definition = program.templateDefinition
  const weekIndex = definition ? programmeWeekIndex(program.currentWeekIndex, definition) : null
  const weekLabel =
    definition && weekIndex !== null ? `Week ${weekIndex + 1} of ${definition.durationWeeks}` : null

  return (
    <Panel surface="inset" p="sm" className="mb-3.5">
      <SectionLabel tone="action">Active programme</SectionLabel>
      <Text mt={3} size="sm" fw={700} lh={1.3} lineClamp={2}>
        {program.title}
      </Text>
      {weekLabel ? <Caption mt={2}>{weekLabel}</Caption> : null}
    </Panel>
  )
}

/** Which way the app is currently reading. Links to the control that changes it. */
function ModeRow() {
  const { mode } = useExperienceMode()
  const isFull = mode === 'full'
  return (
    <Box
      component={Link}
      to="/settings"
      hash="experience"
      data-testid="sidebar-mode-badge"
      className="mt-2 flex items-center justify-between gap-2 px-2 pt-3"
      style={{ borderTop: '1px solid var(--vf-card-border)' }}
    >
      <Caption>Reading mode</Caption>
      <Box
        component="span"
        className="rounded-md px-1.5 py-0.5"
        bg={isFull ? 'var(--vf-action-soft)' : 'var(--vf-surface-inset)'}
        style={{
          border: `1px solid ${isFull ? 'var(--vf-action-border)' : 'var(--vf-card-border)'}`,
        }}
      >
        <Text
          component="span"
          size="0.625rem"
          fw={800}
          tt="uppercase"
          lts="0.05em"
          c={isFull ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)'}
        >
          {experienceModeLabels[mode]}
        </Text>
      </Box>
    </Box>
  )
}
