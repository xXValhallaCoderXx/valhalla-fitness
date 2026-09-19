import { useMe } from './account'

/** Account reading preference; independent of workout view and screen size. */
export function useExperienceMode() {
  const profile = useMe()
  const mode = profile.data?.experienceMode ?? 'guided'
  const isFull = mode === 'full'
  return { mode, isFull, showFormulas: isFull && Boolean(profile.data?.showFormulas) }
}
