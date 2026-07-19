import { createFileRoute } from '@tanstack/react-router'
import { sessionParamsSchema } from '@sheetless/api'
import { getSessionInternal } from '~/domains/session/server/session-functions'
import { handleApiRequest, parseParams } from '~/shared/server/api-route'

export const Route = createFileRoute('/api/v1/sessions/$sessionId')({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleApiRequest(request, async ({ context }) => {
          const input = parseParams(params, sessionParamsSchema)
          return getSessionInternal(input.sessionId, context!)
        }),
    },
  },
})
