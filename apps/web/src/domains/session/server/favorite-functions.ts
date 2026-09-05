import { createServerFn } from '@tanstack/react-start'
import { listFavoriteWorkouts, setSessionFavorite } from '@sheetless/data/session/favorites'
import { setSessionFavoriteInputSchema } from '~/domains/session/lib/schemas'

async function requireUser() {
  const { requireUser } = await import('~/shared/server/require-user')
  return requireUser()
}

export const setSessionFavoriteFn = createServerFn({ method: 'POST' })
  .validator((data) => setSessionFavoriteInputSchema.parse(data))
  .handler(async ({ data }) => setSessionFavorite(await requireUser(), data))

export const listFavoriteWorkoutsFn = createServerFn({ method: 'GET' }).handler(async () =>
  listFavoriteWorkouts(await requireUser()))
