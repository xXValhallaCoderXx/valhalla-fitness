import { createFileRoute } from '@tanstack/react-router'
import { startPlannedSessionInputSchema } from '@sheetless/api'
import { startPlannedSession } from '~/domains/session/server/session-functions'
import { handleApiRequest, parseJson } from '~/shared/server/api-route'

export const Route = createFileRoute('/api/v1/sessions')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApiRequest(
          request,
          async ({ context }) => {
            const input = await parseJson(request, startPlannedSessionInputSchema)
            return startPlannedSession(context!, { clientMutationId: input.clientMutationId })
          },
        ),
    },
  },
})
