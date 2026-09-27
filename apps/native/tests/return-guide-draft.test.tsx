import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultReturnSettings } from '@sheetless/domain/program/return-settings'
import { useReturnGuideDraft } from '../src/features/program/return/useReturnGuideDraft'
import { returnGuideState } from './support/return-guide'

describe('return guide draft', () => {
  it('keeps raw loads, stages, counts and caps through step changes and background refreshes', () => {
    const initial = returnGuideState()
    const { result, rerender } = renderHook(({ state }) => useReturnGuideDraft(state), { initialProps: { state: initial } })
    act(() => { result.current.setStep('fineTune'); result.current.setLoad('state:anchor', '72.'); result.current.updateStage(0, { workouts: '03', counts: { 'slot-day-lift': '02' } }); result.current.setCap('anchor', '0') })
    act(() => result.current.setStep('preview'))
    act(() => result.current.setStep('start'))
    const updated = returnGuideState(); updated.program.stateValues[0].value = 130
    rerender({ state: updated })
    act(() => result.current.setStep('fineTune'))
    expect(result.current.loadText('state:anchor', 72)).toBe('72.')
    expect(result.current.raw.stages[0]).toEqual({ workouts: '03', percentage: '50', counts: { 'slot-day-lift': '02' } })
    expect(result.current.preview.settings.caps.anchor).toBe(0)
    expect(result.current.program.stateValues[0].value).toBe(100)
    expect(result.current.preview.changes[0].after).toBe(72)
  })

  it('does not invent zero from blank or invalid input and preserves it until corrected', () => {
    const { result } = renderHook(() => useReturnGuideDraft(returnGuideState()))
    act(() => result.current.setLoad('state:anchor', ''))
    expect(result.current.valid).toBe(false)
    expect(result.current.outlook).toBeNull()
    act(() => result.current.setLoad('state:anchor', '70,5'))
    expect(result.current.preview.changes[0].after).toBe(70.5)
    act(() => result.current.setField('minimumRir', ''))
    expect(result.current.valid).toBe(false)
    expect(result.current.raw.minimumRir).toBe('')
    act(() => result.current.setField('minimumRir', '3'))
    act(() => result.current.setCap('anchor', 'not a number'))
    expect(result.current.valid).toBe(false)
    act(() => result.current.setCap('anchor', ''))
    expect(result.current.valid).toBe(true)
  })

  it('uses existing product defaults and explicit reset rather than saving or carrying custom preview values', () => {
    const { result } = renderHook(() => useReturnGuideDraft(returnGuideState()))
    expect(result.current.preview.settings).toEqual(defaultReturnSettings(1, 2.5))
    expect(result.current.preview.changes[0].after).toBe(80)
    act(() => { result.current.setLoad('state:anchor', '90'); result.current.setField('defaultCap', '5') })
    act(() => result.current.reset())
    expect(result.current.preview.changes[0].after).toBe(80)
    expect(result.current.raw.defaultCap).toBe('2.5')
    act(() => result.current.setPercentage(90))
    expect(result.current.preview.changes[0].after).toBe(90)
  })

  it('opens an active guide for review at current weights without applying the original reduction again', () => {
    const state = returnGuideState()
    state.program.stateValues[0].value = 82.5
    state.program.returnPeriod = { id: 'period', policyVersion: 1, status: 'review', startedAt: '2026-09-01', completedWorkouts: 2, settings: defaultReturnSettings(1, 2.5) }
    const { result } = renderHook(() => useReturnGuideDraft(state))
    expect(result.current.step).toBe('preview')
    expect(result.current.preview.changes[0]).toMatchObject({ before: 82.5, after: 82.5 })
    act(() => { result.current.setLoad('state:anchor', '75'); result.current.addStage() })
    expect(result.current.raw.stages).toHaveLength(3)
    act(() => result.current.reset())
    expect(result.current.preview.changes[0].after).toBe(82.5)
    expect(result.current.raw.stages).toHaveLength(2)
  })
})
