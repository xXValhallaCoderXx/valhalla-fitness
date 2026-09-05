import { MantineProvider } from '@mantine/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { HistoryInsights } from '@sheetless/domain/history/types'

vi.mock('@mantine/charts', () => ({
  // Recharts calls this with no label before hover, even when it has real data.
  // This is the mounted-browser crash contract, independent of chart layout.
  LineChart: ({ tooltipProps }: { tooltipProps: { labelFormatter: (value: unknown) => string } }) =>
    <div data-testid="chart">{tooltipProps.labelFormatter(undefined)}</div>,
}))
vi.mock('@tanstack/react-router', async (original) => ({
  ...await original<typeof import('@tanstack/react-router')>(),
  Link: 'a',
}))
const { BodyweightTrendCard } = await import('../src/domains/history/components/cards/BodyweightTrendCard')

function render(entries: HistoryInsights['bodyweight']['entries'], range: '8w' | 'all' = '8w') {
  const insights = { bodyweight: { entries, units: 'kg', sex: null }, today: '2026-09-05' } as HistoryInsights
  return renderToStaticMarkup(<MantineProvider><BodyweightTrendCard insights={insights} range={range} /></MantineProvider>)
}

describe('Overview bodyweight presentation', () => {
  it('renders measurements before a tooltip date is selected', () => {
    const html = render([{ id: 'one', recordedOn: '2026-09-01', weightKg: 80 }, { id: 'two', recordedOn: '2026-09-05', weightKg: 81 }])
    expect(html).toContain('81 kg')
    expect(html).toContain('Change in range: +1 kg')
    expect(html).toContain('2026-09-05')
  })
  it('keeps the latest date outside the window and gives an explicit empty range', () => {
    const html = render([{ id: 'one', recordedOn: '2025-01-01', weightKg: 80 }])
    expect(html).toContain('outside selected range')
    expect(html).toContain('No measurements in this range')
    expect(html).not.toContain('Change in range:')
  })
  it('renders without any workout data and makes logging available for empty accounts', () => {
    expect(render([])).toContain('No bodyweight recorded yet')
    expect(render([])).toContain('Log bodyweight')
    const html = render([{ id: 'one', recordedOn: '2026-09-05', weightKg: 80 }], 'all')
    expect(html).toContain('One measurement in range')
    expect(html).not.toContain('Change in range:')
  })
})
