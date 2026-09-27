import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CatalogueItem } from '@sheetless/domain/program/template-families'
import { DEFAULT_CATALOGUE_BROWSE_FILTERS } from '@sheetless/domain/program/catalogue-browsing'
import type { ProgramTemplateSummary } from '@sheetless/domain/program/types'
import { themeProviderMock } from './support/theme'
import { TemplateFilterSheet } from '../src/features/templates/catalogue/TemplateFilterSheet'

vi.mock('@/lib/theme-provider', () => themeProviderMock())

vi.mock('@/components', () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => <button onClick={onPress}>{label}</button>,
  Caption: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  SheetModal: ({ children, footer, onClose }: { children: ReactNode; footer: ReactNode; onClose: () => void }) =>
    <div><button onClick={onClose}>Close</button>{children}{footer}</div>,
  SegmentedControl: ({ options, onChange, accessibilityLabel, value }: {
    options: { value: string; label: string }[]; onChange: (value: string) => void; accessibilityLabel: string; value: string
  }) => <div role="group" aria-label={accessibilityLabel}>{options.map(option =>
    <button aria-pressed={value === option.value} key={option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>,
}))
const items: CatalogueItem[] = [3, 4].map(days => ({ kind: 'single', template: {
  id: `plan-${days}`, name: `Strength ${days}`, description: 'Linear training', tags: ['strength'],
  complexity: 'Beginner', daysPerWeek: days, available: true,
} as ProgramTemplateSummary }))

describe('library filter draft', () => {
  it('keeps choices temporary and commits the exact filters with the matching count', () => {
    const apply = vi.fn()
    render(<TemplateFilterSheet items={items} filters={DEFAULT_CATALOGUE_BROWSE_FILTERS} onApply={apply} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '4 · 1' }))
    expect(apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Show 1 plan' }))
    expect(apply).toHaveBeenCalledWith({ ...DEFAULT_CATALOGUE_BROWSE_FILTERS, days: 4 })
  })

  it('cancels unsubmitted filters and reopening starts with the committed value', () => {
    const apply = vi.fn(), close = vi.fn()
    const props = { items, filters: DEFAULT_CATALOGUE_BROWSE_FILTERS, onApply: apply, onClose: close }
    const first = render(<TemplateFilterSheet {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '4 · 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(close).toHaveBeenCalledOnce()
    expect(apply).not.toHaveBeenCalled()
    first.unmount()
    render(<TemplateFilterSheet {...props} />)
    expect(screen.getByRole('button', { name: 'Show 2 plans' })).toBeTruthy()
  })

  it('clears the facets while retaining the search text, even with no matches', () => {
    const apply = vi.fn()
    render(<TemplateFilterSheet items={items} filters={{ query: 'absent', days: 4, goal: 'muscle', level: 'Advanced' }} onApply={apply} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show 0 plans' }))
    expect(apply).toHaveBeenCalledWith({ ...DEFAULT_CATALOGUE_BROWSE_FILTERS, query: 'absent' })
  })
})
