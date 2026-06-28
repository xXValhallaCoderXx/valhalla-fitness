import { driver, type Driver, type DriveStep } from 'driver.js'
import { useCallback, useEffect, useRef } from 'react'
import { track } from '~/shared/lib/analytics'
import { prefersReducedMotion } from '~/shared/lib/reduced-motion'
import { buildOnboardingSteps } from './onboarding-tour'

/**
 * Imperative driver.js tour. `start()` (re)launches it from the first step; the
 * instance is cleaned up on unmount. Pass a step builder + name to drive a different
 * tour (e.g. the live-session coach-marks) through the same instrumented wrapper.
 *
 * The public `instance.destroy()` does not re-fire `onDestroyStarted`, so the unmount
 * cleanup never emits a spurious skip event — only user-initiated closes do.
 */
export function useOnboardingTour(buildSteps: () => DriveStep[] = buildOnboardingSteps, tourName = 'app') {
  const driverRef = useRef<Driver | null>(null)

  const start = useCallback(() => {
    driverRef.current?.destroy()
    const reduceMotion = prefersReducedMotion()
    const instance = driver({
      showProgress: true,
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      popoverClass: 'vf-tour',
      steps: buildSteps(),
      onHighlighted: (_element, step) => {
        track('onboarding_tour_step_view', { tour: tourName, step: step.data?.stepId })
      },
      onDestroyStarted: (_element, _step, { driver: active }) => {
        track(active.isLastStep() ? 'onboarding_tour_complete' : 'onboarding_tour_skip', {
          tour: tourName,
          index: active.getActiveIndex(),
        })
        active.destroy()
      },
    })
    track('onboarding_tour_start', { tour: tourName })
    driverRef.current = instance
    instance.drive()
  }, [buildSteps, tourName])

  useEffect(() => () => driverRef.current?.destroy(), [])

  return { start }
}
