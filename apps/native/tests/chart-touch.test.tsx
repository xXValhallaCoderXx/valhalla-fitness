import { fireEvent, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ChartTouchTarget } from '../src/components/charts/ChartTouchTarget.web'
import { nearestPointIndex } from '../src/components/charts/chart-geometry'

it('maps browser clicks to chart-local coordinates when the chart is offset on the page', () => {
  const select = vi.fn()
  const points = [{ x: 40, y: 100 }, { x: 140, y: 50 }, { x: 240, y: 0 }]
  const { container } = render(<ChartTouchTarget onSelect={(x) => select(nearestPointIndex(points, x))} />)
  const target = container.firstElementChild as HTMLElement
  target.getBoundingClientRect = () => ({ left: 100, top: 200, width: 280, height: 120 } as DOMRect)
  fireEvent.click(target, { clientX: 140, clientY: 300 })
  expect(select).toHaveBeenLastCalledWith(0)
  fireEvent.click(target, { clientX: 340, clientY: 200 })
  expect(select).toHaveBeenLastCalledWith(2)
  expect(target.tabIndex).toBe(-1)
})
