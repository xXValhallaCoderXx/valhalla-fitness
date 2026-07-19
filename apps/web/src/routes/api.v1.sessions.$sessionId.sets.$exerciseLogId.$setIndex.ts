import { createFileRoute } from '@tanstack/react-router'
import { setParamsSchema, updateSetLogInputSchema } from '@sheetless/api'
import { updateSetLog } from '~/domains/session/server/session-functions'
import { handleApiRequest, parseJson, parseParams } from '~/shared/server/api-route'

export const Route = createFileRoute(
  '/api/v1/sessions/$sessionId/sets/$exerciseLogId/$setIndex',
)({
  server: {
    handlers: {
      PATCH: async ({ request, params }) =>
        handleApiRequest(request, async ({ context }) => {
          const route = parseParams(params, setParamsSchema)
          const input = await parseJson(request, updateSetLogInputSchema)
          return updateSetLog(context!, {
            ...input,
            sessionId: route.sessionId,
            exerciseLogId: route.exerciseLogId,
            setIndex: route.setIndex,
          })
        }),
    },
  },
})
