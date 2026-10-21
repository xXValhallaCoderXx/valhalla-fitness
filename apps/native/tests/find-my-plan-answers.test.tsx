import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { templateCatalog } from '@sheetless/domain/program/templates'
import { templateFamilies } from '@sheetless/domain/program/template-families'
import { recommendFamilies } from '@sheetless/domain/program/recommend-plan'
import { themeProviderMock } from './support/theme'

vi.mock('@/lib/theme-provider', () => themeProviderMock())
vi.mock('lucide-react-native', () => ({ Check: () => null, ChevronRight: () => null, ChevronDown: () => null,
  Info: () => null, Pencil: () => null, RotateCcw: () => null }))
// Text, accessibility and edit wiring only; native layout has a separate device check.
vi.mock('@/components', () => {
  const Block = ({ children }: { children: ReactNode }) => <div>{children}</div>
  return { Caption: Block, Heading: Block, Panel: Block, SectionLabel: Block, Text: Block, Badge: Block,
    EmptyState: ({ title, children }: { title: string; children: ReactNode }) => <div>{title}{children}</div>,
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => <button onClick={onPress}>{label}</button> }
})
import { FindMyPlanQuestions } from '../src/features/templates/find-my-plan/FindMyPlanQuestions'
import { FindMyPlanResult } from '../src/features/templates/find-my-plan/FindMyPlanResult'

it.each([2, 3, 4, 5])('keeps exact %i-day text in So far and the editable result answer', (days) => {
  const answers = { experience: 'Intermediate' as const, days, goal: 'strength' as const }
  const view = render(<FindMyPlanQuestions step={2} answers={{ experience: answers.experience, days }} onChoose={vi.fn()} />)
  expect(screen.getByText('So far')).toBeTruthy()
  expect(screen.getByText(`${days} days`)).toBeTruthy()
  expect(screen.queryByText('—')).toBeNull()
  const recommendation = recommendFamilies(templateCatalog.filter(template => template.daysPerWeek <= days), templateFamilies, answers, 1)[0]
  const edit = vi.fn()
  view.rerender(<FindMyPlanResult answers={answers} recommendation={recommendation} activeIndex={0} alternatives={[]}
    previewOpen={false} previewLoading={false} previewError={null} previewSessions={[]}
    onEditAnswer={edit} onReset={vi.fn()} onSelectPlan={vi.fn()} onTogglePreview={vi.fn()}
    onRetryPreview={vi.fn()} onOpenDetail={vi.fn()} onBrowse={vi.fn()} />)
  const dayAnswer = screen.getByRole('button', { name: `Edit How many days a week can you train?: ${days} days` })
  expect(within(dayAnswer).getByText(`${days} days`)).toBeTruthy()
  expect(screen.queryByText('—')).toBeNull()
  fireEvent.click(dayAnswer)
  expect(edit).toHaveBeenCalledExactlyOnceWith(1)
  if (days === 2) expect(screen.getByText(/No available plan fits within 2 training days a week/)).toBeTruthy()
})
