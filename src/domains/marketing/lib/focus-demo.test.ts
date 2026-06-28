import { describe, expect, it } from 'vitest'
import {
  firstActiveFocusDemoIndex,
  initialFocusDemoSets,
  pickFocusDemoRir,
  summarizeFocusDemo,
  toggleFocusDemoSet,
  type FocusDemoSet,
} from './focus-demo'

const allDone: FocusDemoSet[] = Array.from({ length: 5 }, () => ({ done: true, rir: 2 }))
const noneDone: FocusDemoSet[] = Array.from({ length: 5 }, () => ({ done: false, rir: null }))

describe('summarizeFocusDemo', () => {
  it('summarizes the initial state (1 of 5 done)', () => {
    expect(summarizeFocusDemo(initialFocusDemoSets)).toEqual({
      doneCount: 1,
      total: 5,
      donePct: 20,
      doneLabel: '1 of 5 sets',
    })
  })

  it('reports 0% when nothing is done', () => {
    expect(summarizeFocusDemo(noneDone)).toMatchObject({ doneCount: 0, donePct: 0, doneLabel: '0 of 5 sets' })
  })

  it('reports 100% when everything is done', () => {
    expect(summarizeFocusDemo(allDone)).toMatchObject({ doneCount: 5, donePct: 100, doneLabel: '5 of 5 sets' })
  })

  it('handles an empty list without dividing by zero', () => {
    expect(summarizeFocusDemo([])).toEqual({ doneCount: 0, total: 0, donePct: 0, doneLabel: '0 of 0 sets' })
  })
})

describe('toggleFocusDemoSet', () => {
  it('completing a fresh set defaults its RIR to 1', () => {
    const next = toggleFocusDemoSet(noneDone, 2)
    expect(next[2]).toEqual({ done: true, rir: 1 })
  })

  it('un-completing a set keeps its RIR and leaves other sets untouched', () => {
    const next = toggleFocusDemoSet(initialFocusDemoSets, 0)
    expect(next[0]).toEqual({ done: false, rir: 1 })
    expect(next[1]).toBe(initialFocusDemoSets[1])
  })
})

describe('pickFocusDemoRir', () => {
  it('selecting an RIR marks the set done with that value', () => {
    const next = pickFocusDemoRir(noneDone, 3, 0)
    expect(next[3]).toEqual({ done: true, rir: 0 })
  })
})

describe('firstActiveFocusDemoIndex', () => {
  it('finds the first not-done set', () => {
    expect(firstActiveFocusDemoIndex(initialFocusDemoSets)).toBe(1)
  })

  it('returns -1 when all sets are done', () => {
    expect(firstActiveFocusDemoIndex(allDone)).toBe(-1)
  })
})
