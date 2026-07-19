import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { SectionLabel, Text } from '~/components'
import { formatRest, remaining } from '~/domains/session/lib/rest-timer'
import { playRestCompleteCue } from '~/domains/session/lib/rest-timer-cue'
import { useRestTimerControls, useRestTimerState } from '~/domains/session/lib/rest-timer-context'

/**
 * The only ticking part of the rest timer: a fixed bottom pill that recomputes the remaining time
 * from the wall-clock `endsAt` every 250ms (display-only). Fires the completion cue once and
 * dismisses when it reaches zero.
 */
export function RestTimerPill() {
  const { endsAt, active, label } = useRestTimerState()
  const { addTime, dismiss } = useRestTimerControls()
  const [secondsLeft, setSecondsLeft] = useState(0)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!active || endsAt == null || typeof window === 'undefined') return
    firedRef.current = false
    const update = () => {
      const left = remaining(endsAt, Date.now())
      setSecondsLeft(left)
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true
        playRestCompleteCue()
        dismiss()
      }
    }
    update()
    const id = window.setInterval(update, 250)
    return () => window.clearInterval(id)
  }, [active, endsAt, dismiss])

  if (!active || endsAt == null) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      data-testid="rest-timer-pill"
    >
      {/* Lifted off the bottom edge and elevated on desktop so it reads as a floating control,
          not something stuck to the window edge (where it's easy to miss on a large screen). */}
      <div
        className="flex items-center gap-3 rounded-full border py-2 pl-2 pr-2 md:mb-5 md:gap-4 md:py-2.5 md:pl-2.5 md:pr-3"
        style={{
          backgroundColor: 'var(--mantine-color-default)',
          borderColor: 'var(--mantine-primary-color-filled)',
          boxShadow: 'var(--vf-shadow-panel)',
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Skip rest"
          className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95"
          style={{ backgroundColor: 'var(--vf-surface-2)', color: 'var(--mantine-color-dimmed)' }}
        >
          <X size={16} />
        </button>

        <div className="min-w-[5rem] text-center">
          <SectionLabel size="0.5625rem">Rest{label ? ` · ${label}` : ''}</SectionLabel>
          <Text component="p" size="lg" fw={900} style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }} data-testid="rest-timer-remaining">
            {formatRest(secondsLeft)}
          </Text>
        </div>

        <button
          type="button"
          onClick={() => addTime(15)}
          aria-label="Add 15 seconds"
          className="flex h-9 items-center gap-0.5 rounded-full px-3 transition active:scale-95"
          style={{ backgroundColor: 'var(--mantine-primary-color-filled)', color: 'white' }}
        >
          <Plus size={14} />
          <Text component="span" size="sm" fw={800} c="white">
            15s
          </Text>
        </button>
      </div>
    </div>
  )
}
