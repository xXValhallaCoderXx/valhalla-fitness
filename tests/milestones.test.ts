import { describe, expect, it } from 'vitest'
import {
  MILESTONE_SESSIONS,
  MILESTONE_SETS,
  MILESTONE_TONNAGE,
  buildMilestones,
} from '../src/domains/history/lib/milestones'
import type { Unit } from '../src/shared/types'

type MilestoneInput = { tonnage: number; sessions: number; sets: number; units: Unit | null }

function input(partial: Partial<MilestoneInput> = {}): MilestoneInput {
  return {
    tonnage: partial.tonnage ?? 0,
    sessions: partial.sessions ?? 0,
    sets: partial.sets ?? 0,
    units: partial.units !== undefined ? partial.units : 'kg',
  }
}

describe('buildMilestones', () => {
  it('earns nothing at zero input and points nextUp at the first tonnage threshold', () => {
    const summary = buildMilestones(input())

    expect(summary.earned).toEqual([])
    // All kinds sit at 0% — deterministic tie-break by kind order tonnage → sessions → sets.
    expect(summary.nextUp).toEqual({
      kind: 'tonnage',
      threshold: 10_000,
      label: '10k kg moved',
      progressPercent: 0,
    })
  })

  it('earns a milestone when the value lands exactly on the threshold', () => {
    const summary = buildMilestones(input({ tonnage: 10_000, sessions: 1, sets: 100 }))

    expect(summary.earned).toEqual([
      { kind: 'tonnage', threshold: 10_000, label: '10k kg moved' },
      { kind: 'sessions', threshold: 1, label: '1 session' },
      { kind: 'sets', threshold: 100, label: '100 sets' },
    ])
  })

  it('orders earned milestones by kind then ascending threshold', () => {
    const summary = buildMilestones(input({ tonnage: 60_000, sessions: 12, sets: 600 }))

    expect(summary.earned.map((m) => `${m.kind}:${m.threshold}`)).toEqual([
      'tonnage:10000',
      'tonnage:25000',
      'tonnage:50000',
      'sessions:1',
      'sessions:10',
      'sets:100',
      'sets:500',
    ])
  })

  it('formats labels with compact counts, units, and singular sessions', () => {
    const lb = buildMilestones(
      input({ tonnage: 1_000_000, sessions: 250, sets: 5000, units: 'lb' }),
    )
    const labels = new Map(lb.earned.map((m) => [`${m.kind}:${m.threshold}`, m.label]))

    expect(labels.get('tonnage:10000')).toBe('10k lb moved')
    expect(labels.get('tonnage:25000')).toBe('25k lb moved')
    expect(labels.get('tonnage:1000000')).toBe('1M lb moved')
    expect(labels.get('sessions:1')).toBe('1 session')
    expect(labels.get('sessions:10')).toBe('10 sessions')
    expect(labels.get('sets:100')).toBe('100 sets')
    expect(labels.get('sets:2500')).toBe('2.5k sets')
  })

  it('falls back to kg in tonnage labels when units are null', () => {
    const summary = buildMilestones(input({ tonnage: 10_000, units: null }))

    expect(summary.earned[0]?.label).toBe('10k kg moved')
  })

  it('picks the highest-progress uncrossed milestone across kinds as nextUp', () => {
    // sessions 9/10 = 90% beats tonnage 12k/25k = 48% and sets 50/100 = 50%.
    const summary = buildMilestones(input({ tonnage: 12_000, sessions: 9, sets: 50 }))

    expect(summary.nextUp).toEqual({
      kind: 'sessions',
      threshold: 10,
      label: '10 sessions',
      progressPercent: 90,
    })
  })

  it('returns nextUp null once every milestone is earned', () => {
    const summary = buildMilestones(
      input({ tonnage: 1_000_000, sessions: 250, sets: 5000 }),
    )

    expect(summary.nextUp).toBeNull()
    expect(summary.earned).toHaveLength(
      MILESTONE_TONNAGE.length + MILESTONE_SESSIONS.length + MILESTONE_SETS.length,
    )
  })
})
