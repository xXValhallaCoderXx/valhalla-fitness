export type PreparedImage = { uri: string; dispose: () => void | Promise<void> }
export type PreviewState<T> = {
  key: string
  phase: 'idle' | 'loading' | 'ready' | 'error'
  image: T | null
  exporting: boolean
  error: 'generation' | 'export' | null
}

/** Owns generation ordering and resource lifetime independently of either UI runtime. */
export function createPreviewController<T extends PreparedImage>() {
  type Entry = { image: T; users: number; retired: boolean; disposed: boolean }
  let state: PreviewState<T> = { key: '', phase: 'idle', image: null, exporting: false, error: null }
  let generation = 0
  let busy = false
  let current: Entry | null = null
  const listeners = new Set<() => void>()
  const publish = (next: PreviewState<T>) => {
    state = next
    listeners.forEach((listener) => listener())
  }
  const cleanup = (entry: Entry) => {
    if (!entry.retired || entry.users || entry.disposed) return
    entry.disposed = true
    // A cleanup failure must never turn a completed export into a reported failure.
    try { void Promise.resolve(entry.image.dispose()).catch(() => {}) } catch { /* best effort */ }
  }
  const retire = () => {
    if (!current) return
    current.retired = true
    cleanup(current)
    current = null
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    async generate(key: string, prepare: () => Promise<T>) {
      const request = ++generation
      retire()
      publish({ key, phase: 'loading', image: null, exporting: busy, error: null })
      try {
        const image = await prepare()
        const entry = { image, users: 0, retired: request !== generation, disposed: false }
        if (entry.retired) { cleanup(entry); return }
        current = entry
        publish({ key, phase: 'ready', image, exporting: busy, error: null })
      } catch {
        if (request === generation) publish({ key, phase: 'error', image: null, exporting: busy, error: 'generation' })
      }
    },
    cancel() {
      ++generation
      retire()
      publish({ key: '', phase: 'idle', image: null, exporting: busy, error: null })
    },
    async exportImage(action: (image: T) => void | Promise<void>) {
      if (busy || !current || state.phase !== 'ready') return
      busy = true
      const entry = current
      const request = generation
      entry.users++
      publish({ ...state, exporting: true, error: null })
      let failed = false
      try {
        // Invoke synchronously before the first await to preserve browser user activation.
        await action(entry.image)
      } catch (error) {
        failed = !(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')
      } finally {
        busy = false
        entry.users--
        cleanup(entry)
        if (request === generation) publish({ ...state, exporting: false, error: failed ? 'export' : null })
        else if (state.exporting) publish({ ...state, exporting: false })
      }
    },
  }
}
