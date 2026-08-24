import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { themeProviderMock } from './support/theme'

vi.mock('@/lib/theme-provider', () => themeProviderMock())

const { SegmentedControl } = await import('../src/components/SegmentedControl')
const { themes } = await import('../src/lib/tokens')

/**
 * Rendered through react-native-web, so this covers wiring, disabled handling,
 * and the selected/unselected fill the component resolves itself. It does not
 * cover the native accessibility mapping: react-native-web does not mirror
 * `accessibilityState` onto `aria-selected`, so selection state on a real device
 * is a screen-reader check, not an assertion here.
 */
const options = [
  { value: 'overview', label: 'Overview', testID: 'seg-overview' },
  { value: 'sessions', label: 'Sessions', testID: 'seg-sessions' },
  { value: 'records', label: 'Records', testID: 'seg-records', disabled: true },
]

const backgroundOf = (testID: string) =>
  screen.getByTestId(testID).style.getPropertyValue('background-color')

/** jsdom normalises hex colours to rgb(), so token values need converting. */
const asRgb = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

describe('SegmentedControl', () => {
  it('fills only the current value', () => {
    render(
      <SegmentedControl
        options={options}
        value="sessions"
        onChange={vi.fn()}
        accessibilityLabel="Insights section"
      />,
    )
    expect(backgroundOf('seg-sessions')).not.toBe(backgroundOf('seg-overview'))
    expect(backgroundOf('seg-overview')).toBe(backgroundOf('seg-records'))
  })

  it('reports the pressed value', () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        options={options}
        value="overview"
        onChange={onChange}
        accessibilityLabel="Insights section"
      />,
    )
    fireEvent.click(screen.getByTestId('seg-sessions'))
    expect(onChange).toHaveBeenCalledWith('sessions')
  })

  it('ignores a per-option disabled segment', () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        options={options}
        value="overview"
        onChange={onChange}
        accessibilityLabel="Insights section"
      />,
    )
    fireEvent.click(screen.getByTestId('seg-records'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignores every segment while the whole control is disabled', () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        options={options}
        value="overview"
        onChange={onChange}
        disabled
        accessibilityLabel="Insights section"
      />,
    )
    fireEvent.click(screen.getByTestId('seg-sessions'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders every option exactly once', () => {
    render(
      <SegmentedControl
        options={options}
        value="overview"
        onChange={vi.fn()}
        accessibilityLabel="Insights section"
      />,
    )
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('announces the group once, under its accessible name', () => {
    render(
      <SegmentedControl
        options={options}
        value="overview"
        onChange={vi.fn()}
        accessibilityLabel="Programme level filter"
      />,
    )
    const group = screen.getByRole('tablist')
    expect(group.getAttribute('aria-label')).toBe('Programme level filter')
  })

  it('renders an optional section label', () => {
    render(
      <SegmentedControl
        label="Level"
        options={options}
        value="overview"
        onChange={vi.fn()}
        accessibilityLabel="Programme level filter"
      />,
    )
    expect(screen.getByText('Level')).toBeTruthy()
  })

  it('resolves fills from the active scheme', () => {
    render(
      <SegmentedControl
        options={options}
        value="overview"
        onChange={vi.fn()}
        accessibilityLabel="Insights section"
      />,
    )
    // themeProviderMock defaults to dark, so the unselected fill is dark surface.
    expect(backgroundOf('seg-sessions')).toBe(asRgb(themes.dark.surface))
  })
})
