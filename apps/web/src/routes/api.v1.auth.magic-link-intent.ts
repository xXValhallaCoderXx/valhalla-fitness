import { createFileRoute } from '@tanstack/react-router'
import { magicLinkIntentInputSchema } from '@sheetless/api'
import { getMagicLinkIntent } from '~/domains/account/server/auth-functions'
import { handleApiRequest, parseJson } from '~/shared/server/api-route'

export const Route = createFileRoute('/api/v1/auth/magic-link-intent')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApiRequest(
          request,
          async () => {
            const input = await parseJson(request, magicLinkIntentInputSchema)
            return getMagicLinkIntent(input.email)
          },
          { authenticated: false },
        ),
    },
  },
})
