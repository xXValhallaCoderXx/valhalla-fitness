import { describe, expect, it, vi } from 'vitest'
import { createRestNotificationScheduler } from '../src/features/session/rest-timer/rest-notification-scheduler'

function pending() {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((done) => { resolve = done })
  return { promise, resolve }
}

describe('rest notification ownership', () => {
  it('cancels a late schedule after skip, finish or provider unmount', async () => {
    const first = pending()
    const cancel = vi.fn(async () => {})
    const owner = createRestNotificationScheduler(() => first.promise, cancel)
    owner.replace(120_000, 'Bench')
    owner.clear()
    first.resolve('old-alarm')
    await first.promise
    expect(cancel).toHaveBeenCalledWith('old-alarm')
  })

  it('retains only the newest alarm when extension schedules resolve out of order', async () => {
    const first = pending()
    const second = pending()
    const schedule = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const cancel = vi.fn(async () => {})
    const owner = createRestNotificationScheduler(schedule, cancel)
    owner.replace(120_000, 'Bench')
    owner.replace(135_000, 'Bench')
    second.resolve('new-alarm')
    await second.promise
    first.resolve('old-alarm')
    await first.promise
    expect(cancel).toHaveBeenCalledWith('old-alarm')
    expect(cancel).not.toHaveBeenCalledWith('new-alarm')
    owner.clear()
    expect(cancel).toHaveBeenCalledWith('new-alarm')
  })
})
