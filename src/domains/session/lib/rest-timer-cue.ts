// Best-effort audio + haptic cue for rest-timer completion. All feature-detected and SSR-safe.

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioContext) {
    try {
      audioContext = new Ctor()
    } catch {
      return null
    }
  }
  return audioContext
}

/**
 * Create/resume the AudioContext inside a user gesture (the set-complete tap) so a beep can play
 * later when rest ends — browsers block audio started outside a gesture.
 */
export function primeRestCue() {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

/** Two short beeps + a vibration when rest completes. No-ops silently where unsupported. */
export function playRestCompleteCue() {
  const ctx = getAudioContext()
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    for (let i = 0; i < 2; i += 1) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + i * 0.22
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.2)
    }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([120, 60, 120])
  }
}
