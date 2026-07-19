import { createFileRoute } from '@tanstack/react-router'
import { getTodayInternal } from '~/domains/session/server/session-functions'
import { toNativeToday } from '~/domains/session/server/mobile-dto'
import { handleApiRequest } from '~/shared/server/api-route'

export const Route = createFileRoute('/api/v1/today')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApiRequest(request, async ({ context }) => {
          const today = await getTodayInternal(context!)
          return toNativeToday(today)
        }),
    },
  },
})
