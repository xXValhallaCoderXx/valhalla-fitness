import { createServerFn } from '@tanstack/react-start'
import type { ExperienceSignals } from '@sheetless/data/account/experience'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

async function hasSupabaseEnv() {
  const { hasSupabaseEnv } = await import('~/shared/server/supabase')
  return hasSupabaseEnv()
}

export const getExperienceSignalsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ExperienceSignals | null> => {
    if (!(await hasSupabaseEnv())) return null
    try {
      const { getExperienceSignals } = await import('@sheetless/data/account/experience')
      return await getExperienceSignals(await requireUser())
    } catch (error) {
      if (error instanceof Error && error.message === 'Not authenticated') return null
      throw error
    }
  },
)

export const dismissFullModeHintFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { dismissFullModeHint } = await import('@sheetless/data/account/profile')
  return dismissFullModeHint(await requireUser())
})

export const restoreFullModeHintFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { restoreFullModeHint } = await import('@sheetless/data/account/profile')
  return restoreFullModeHint(await requireUser())
})
