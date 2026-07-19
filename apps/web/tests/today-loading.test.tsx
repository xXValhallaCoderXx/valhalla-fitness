import { MantineProvider } from '@mantine/core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ProgramProgressPanel,
  RecoveryCheckPanel,
  StreakBadge,
  WeeklyVolumePanel,
} from '../src/domains/session/components/today/TodayPanels'
import { TodayPageSkeleton } from '../src/domains/session/components/today/TodayPageSkeleton'
import type { HistoryDashboard, HistoryDashboardWithInsights, ProgramOverview } from '../src/shared/types'

function render(component: ReactNode) {
  return renderToStaticMarkup(<MantineProvider>{component}</MantineProvider>)
}

function makeStreakHistory(currentStreakWeeks: number) {
  return {
    insights: {
      consistency: {
        currentStreakWeeks,
      },
    },
  } as unknown as HistoryDashboardWithInsights
}

describe('Today loading states', () => {
  it('uses a Today-shaped accessible skeleton for a cold load', () => {
    const html = render(<TodayPageSkeleton />)

    expect(html).toContain('data-testid="today-page-loading"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Loading today')
    expect(html).toContain('data-testid="today-loading-hero"')
    expect(html).toContain('data-testid="today-loading-workout"')
    expect(html).toContain('data-testid="today-loading-recovery"')
    expect(html).toContain('data-testid="today-loading-action"')
  })

  it('reserves the streak slot only while history is initially pending', () => {
    const pending = render(<StreakBadge isPending />)
    const failed = render(<StreakBadge isError />)
    const noStreak = render(<StreakBadge history={makeStreakHistory(1)} />)

    expect(pending).toContain('data-testid="streak-badge-loading"')
    expect(pending).toContain('Loading workout streak')
    expect(failed).not.toContain('streak-badge-loading')
    expect(noStreak).not.toContain('streak-badge')
  })

  it('keeps cached streak content visible after a secondary query error', () => {
    const html = render(<StreakBadge history={makeStreakHistory(3)} isError />)

    expect(html).toContain('data-testid="streak-badge"')
    expect(html).toContain('3-week streak')
    expect(html).not.toContain('streak-badge-loading')
  })

  it('reserves active-session panels while secondary data is pending', () => {
    const program = render(<ProgramProgressPanel isPending />)
    const volume = render(<WeeklyVolumePanel isPending />)
    const recovery = render(<RecoveryCheckPanel isPending />)

    expect(program).toContain('data-testid="program-progress-loading"')
    expect(volume).toContain('data-testid="weekly-volume-loading"')
    expect(recovery).toContain('data-testid="recovery-check-loading"')
    expect(program).toContain('Loading program progress')
    expect(volume).toContain('Loading weekly volume')
    expect(recovery).toContain('Loading recovery check')
  })

  it('shows compact unavailable states when optional panels fail', () => {
    const program = render(<ProgramProgressPanel isError />)
    const volume = render(<WeeklyVolumePanel isError />)
    const recovery = render(<RecoveryCheckPanel isError />)

    expect(program).toContain('Program progress is unavailable right now.')
    expect(volume).toContain('Weekly volume is unavailable right now.')
    expect(recovery).toContain('Recovery data is unavailable right now.')
  })

  it('prefers cached panel data over an error state', () => {
    const overview = {
      activeProgram: { title: 'Atlas' },
      position: {
        progressPercent: 50,
        weekLabel: 'Week 2',
        phaseLabel: 'Base',
      },
    } as unknown as ProgramOverview
    const history = {
      overview: { units: 'kg' },
      weeklyVolume: [
        {
          weekStart: '2026-07-13',
          weekLabel: 'Jul 13',
          volume: 4200,
          completedSets: 12,
          sessionCount: 2,
        },
      ],
    } as unknown as HistoryDashboard

    const program = render(<ProgramProgressPanel overview={overview} isError />)
    const volume = render(<WeeklyVolumePanel history={history} isError />)

    expect(program).toContain('Atlas')
    expect(program).not.toContain('program-progress-unavailable')
    expect(volume).toContain('4,200 kg')
    expect(volume).not.toContain('weekly-volume-unavailable')
  })
})
