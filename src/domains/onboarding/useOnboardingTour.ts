import { driver, type Driver } from 'driver.js'
import { useCallback, useEffect, useRef } from 'react'
import { buildOnboardingSteps } from './onboarding-tour'

/**
 * Imperative driver.js tour. `start()` (re)launches it from the first step; the
 * instance is cleaned up on unmount.
 */
export function useOnboardingTour() {
  const driverRef = useRef<Driver | null>(null)

  const start = useCallback(() => {
    driverRef.current?.destroy()
    const instance = driver({
      showProgress: true,
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      popoverClass: 'vf-tour',
      steps: buildOnboardingSteps(),
    })
    driverRef.current = instance
    instance.drive()
  }, [])

  useEffect(() => () => driverRef.current?.destroy(), [])

  return { start }
}
