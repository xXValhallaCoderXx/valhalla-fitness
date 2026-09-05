import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { svgMock } from './support/svg'
import { themeProviderMock } from './support/theme'

vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('react-native-svg', () => svgMock())

const { TrendChart } = await import('../src/components/charts/TrendChart')
const { AreaChart } = await import('../src/components/charts/AreaChart')
const { LineChart } = await import('../src/components/charts/LineChart')
const { Sparkline } = await import('../src/components/charts/Sparkline')

const point = (label: string, value: number | null) => ({ label, value })

/**
 * Scope: the decisions the component makes before it has a width — the empty
 * state, the pre-measurement hold, and the accessible name.
 *
 * The painted output is deliberately NOT asserted here. `onLayout` under
 * react-native-web is driven by ResizeObserver, which jsdom does not implement,
 * and stubbing it would still yield a zero-width `getBoundingClientRect` — so a
 * "measured" render would prove nothing. Every path string, tick, and gap is
 * pinned by chart-geometry.test.ts, and the pixels are a device check.
 */
describe('TrendChart', () => {
  it('shows the empty message instead of an axis when nothing is plottable', () => {
    render(
      <TrendChart
        series={[{ key: 'a', points: [point('W1', null), point('W2', null)], tone: 'action' }]}
        emptyMessage="Not enough training logged yet."
        accessibilityLabel="Weekly volume"
        testID="chart"
      />,
    )
    expect(screen.getByText('Not enough training logged yet.')).toBeTruthy()
    expect(document.querySelector('svg')).toBeNull()
  })

  it('treats a series with no points at all as empty', () => {
    render(
      <TrendChart
        series={[{ key: 'a', points: [], tone: 'action' }]}
        emptyMessage="No sessions yet."
        accessibilityLabel="Weekly volume"
        testID="chart"
      />,
    )
    expect(screen.getByText('No sessions yet.')).toBeTruthy()
  })

  it('holds an empty box, not an empty message, before the first measurement', () => {
    render(
      <LineChart
        points={[point('W1', 100), point('W2', 120)]}
        emptyMessage="No data"
        accessibilityLabel="Estimated 1RM"
        testID="chart"
      />,
    )
    // Plottable data, so no empty copy — but nothing painted until measured.
    expect(screen.queryByText('No data')).toBeNull()
    expect(document.querySelector('svg')).toBeNull()
  })

  it('reserves its height while unmeasured so the layout does not jump', () => {
    render(
      <LineChart
        points={[point('W1', 100), point('W2', 120)]}
        height={220}
        emptyMessage="No data"
        accessibilityLabel="Estimated 1RM"
        testID="chart"
      />,
    )
    const placeholder = screen.getByTestId('chart').firstElementChild as HTMLElement
    expect(placeholder.style.getPropertyValue('height')).toBe('220px')
  })

  it('exposes an accessible name for the whole figure', () => {
    render(
      <LineChart
        points={[point('W1', 100), point('W2', 120)]}
        emptyMessage="No data"
        accessibilityLabel="Estimated 1RM over 8 weeks"
        testID="chart"
      />,
    )
    expect(screen.getByLabelText('Estimated 1RM over 8 weeks')).toBeTruthy()
  })

  it('keeps the accessible name on the empty state too', () => {
    render(
      <AreaChart
        points={[point('W1', null)]}
        emptyMessage="No volume yet"
        accessibilityLabel="Weekly volume"
        testID="chart"
      />,
    )
    expect(screen.getByText('No volume yet')).toBeTruthy()
  })

  it('renders a sparkline without axis furniture', () => {
    render(
      <Sparkline
        points={[point('W1', null)]}
        emptyMessage="No trend yet"
        accessibilityLabel="Bodyweight trend"
        testID="spark"
      />,
    )
    expect(screen.getByText('No trend yet')).toBeTruthy()
  })
})


it('inspects dated values through accessible controls and resets when the range changes', () => {
  const props = { inspectable: true, emptyMessage: 'No data', accessibilityLabel: 'Weight' }
  const { rerender } = render(<LineChart {...props} points={[
    { label: 'Sep 1', date: '2026-09-01', value: 80 },
    { label: 'Sep 2', date: '2026-09-02', value: null },
    { label: 'Sep 5', date: '2026-09-05', value: 81 },
  ]} />)
  expect(screen.getByText('2026-09-05: 81')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Weight: previous reading' }))
  expect(screen.getByText('2026-09-01: 80')).toBeTruthy()
  rerender(<LineChart {...props} points={[{ label: 'Aug 1', date: '2026-08-01', value: 79 }]} />)
  expect(screen.getByText('2026-08-01: 79')).toBeTruthy()
})
