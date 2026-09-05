import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkoutShareLoader, type WorkoutShareViewProps } from '~/domains/history/components/sharing/WorkoutShareLoader'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'

vi.mock('@mantine/core', () => ({ Button: 'button', Stack: 'div' }))
vi.mock('~/components', () => ({ Text: 'p' }))

const model: WorkoutShareModel = {
  title: 'Upper body', date: '2026-09-05', dateLabel: 'September 5, 2026',
  filename: 'sheetless-workout-2026-09-05.png', completedSets: 1, durationSeconds: null,
  exercises: [{ movementId: 'a', name: 'Pull-ups', result: '10 reps', isPr: false }],
  overflowCount: 0, prCount: 0,
}
const view = { default: ({ model }: WorkoutShareViewProps) => createElement('div', null, model.title) }
let host: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host, { onCaughtError() {} })
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe('share preview chunk loading', () => {
  it('keeps loading cancellable, contains import failure, and retries with a fresh lazy component', async () => {
    let rejectLoad!: (error: Error) => void
    const load = vi.fn().mockImplementationOnce(() => new Promise((_, reject) => { rejectLoad = reject }))
      .mockResolvedValueOnce(view)
    const onBack = vi.fn()
    await act(async () => root.render(createElement(WorkoutShareLoader, { load, model, onBack })))
    expect(host.querySelector('[role="status"]')?.textContent).toBe('Loading image preview…')
    await act(async () => host.querySelector('button')!.click())
    expect(onBack).toHaveBeenCalledOnce()
    await act(async () => rejectLoad(new Error('Chunk unavailable')))
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Could not load the image preview')
    await act(async () => [...host.querySelectorAll('button')].find((button) => button.textContent === 'Retry preview')!.click())
    expect(load).toHaveBeenCalledTimes(2)
    expect(host.textContent).toBe('Upper body')
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  it('does not restore a preview when its import finishes after closing', async () => {
    let resolveLoad!: (module: typeof view) => void
    const load = () => new Promise<typeof view>((resolve) => { resolveLoad = resolve })
    await act(async () => root.render(createElement(WorkoutShareLoader, { load, model, onBack() {} })))
    await act(async () => root.render(null))
    await act(async () => resolveLoad(view))
    expect(host.childElementCount).toBe(0)
  })
})
