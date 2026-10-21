type LeaveRequest = (action: () => void) => void

/** Focused editors register in order; an open sheet takes precedence over its page. */
export function createSettingsNavigationGuard() {
  const guards = new Map<symbol, LeaveRequest>()
  return {
    register(request: LeaveRequest) {
      const key = Symbol('settings editor')
      guards.set(key, request)
      return () => { guards.delete(key) }
    },
    request(action: () => void) {
      const guard = [...guards.values()].at(-1)
      if (!guard) return false
      guard(action)
      return true
    },
  }
}

export const settingsNavigationGuard = createSettingsNavigationGuard()
