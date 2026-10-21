import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTodayHistorySupport } from '@sheetless/data/history/history'
import { addCalendarDays } from '@sheetless/domain/shared/calendar-date'
import { makeStubCtx } from './support/supabase-stub'

afterEach(() => vi.useRealTimers())

describe('Today calendar reads', () => {
  it('paginates lifetime dates for the run without reading lifetime exercise details', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T12:00:00Z'))
    const sessions = Array.from({ length: 600 }, (_, index) => ({ id: `s-${index}`, user_id: 'user-1',
      status: 'completed', scheduled_date: addCalendarDays('2026-09-21', -index * 7),
      completed_at: addCalendarDays('2026-09-21', -index * 7),
      prescription_snapshot: { title: 'Workout', units: 'kg', movements: [], weekIndex: index } }))
    const { ctx, stub } = makeStubCtx({ profiles: [{ id: 'user-1', timezone: 'Asia/Singapore', units: 'lb' }],
      workout_sessions: sessions })
    const result = await getTodayHistorySupport(ctx)
    expect(result.consistency.currentStreakWeeks).toBe(600)
    expect(result.units).toBe('lb')
    expect(result.calendarWeek?.completedSessions).toBe(1)
    expect(stub.rangeCalls.some(call => call.table === 'workout_sessions' && call.from === 500)).toBe(true)
    expect(result.weeklyVolume.length).toBeLessThanOrEqual(8)
  })
})
