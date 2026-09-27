import { describe, expect, it, vi } from 'vitest'
import { synchronizeNavigationBar } from '../src/lib/navigation-bar-lifecycle'

function setup(state = 'active') {
  let listener: (state: string) => void = () => undefined
  const remove = vi.fn()
  const lifecycle = { currentState: state, addEventListener: (_event: 'change', next: typeof listener) => {
    listener = next
    return { remove }
  } }
  const module = { setHidden: vi.fn().mockResolvedValue(undefined), setStyle: vi.fn().mockResolvedValue(undefined) }
  const report = vi.fn()
  const transition = (next: string) => { lifecycle.currentState = next; listener(next) }
  return { lifecycle, module, report, remove, transition }
}

describe('Android navigation bar lifecycle', () => {
  it('waits for an active Activity, reapplies on resume, and never restores during cleanup', async () => {
    const h = setup('background')
    const stop = synchronizeNavigationBar(h.module, h.lifecycle, 'light', h.report)
    expect(h.module.setHidden).not.toHaveBeenCalled()
    h.transition('active')
    await Promise.resolve()
    expect(h.module.setStyle).toHaveBeenCalledWith('light')
    h.transition('background')
    h.transition('active')
    await Promise.resolve()
    expect(h.module.setStyle).toHaveBeenCalledTimes(2)
    stop()
    h.transition('active')
    await Promise.resolve()
    expect(h.remove).toHaveBeenCalledOnce()
    expect(h.module.setHidden.mock.calls).toEqual([[false], [false]])
  })

  it('handles the exact Activity teardown rejection and retries on the next resume', async () => {
    const h = setup()
    h.module.setHidden.mockRejectedValueOnce(new Error("Call to function 'ExpoNavigationBar.setHidden' has been rejected. Caused by: The current activity is no longer available"))
    const stop = synchronizeNavigationBar(h.module, h.lifecycle, 'dark', h.report)
    await Promise.resolve()
    expect(h.report).not.toHaveBeenCalled()
    expect(h.module.setStyle).not.toHaveBeenCalled()
    h.transition('background')
    h.transition('active')
    await Promise.resolve()
    expect(h.module.setStyle).toHaveBeenCalledWith('dark')
    stop()
  })

  it('does not issue the second native call after unmount and reports other errors', async () => {
    const h = setup()
    let resolve!: () => void
    h.module.setHidden.mockReturnValueOnce(new Promise<void>(done => { resolve = done }))
    const stop = synchronizeNavigationBar(h.module, h.lifecycle, 'light', h.report)
    stop()
    resolve()
    await Promise.resolve()
    expect(h.module.setStyle).not.toHaveBeenCalled()
    const error = new Error('Unexpected native failure')
    h.module.setStyle.mockRejectedValueOnce(error)
    const stopAgain = synchronizeNavigationBar(h.module, h.lifecycle, 'dark', h.report)
    await Promise.resolve()
    await Promise.resolve()
    expect(h.report).toHaveBeenCalledWith(error)
    stopAgain()
  })
})
