import { ZodError, type ZodType } from 'zod'
import type { AuthenticatedServiceContext } from './service-context'
import { createBearerServiceContext } from './service-context'
import { isServiceError, ServiceError } from './service-error'

type HandlerInput = {
  requestId: string
  context: AuthenticatedServiceContext | null
}

type ApiHandlerOptions = {
  authenticated?: boolean
  successStatus?: number
}

function requestId() {
  return globalThis.crypto.randomUUID()
}

function responseHeaders(id: string) {
  return {
    'Cache-Control': 'no-store',
    'X-Request-Id': id,
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let input: unknown
  try {
    input = await request.json()
  } catch {
    throw new ServiceError('VALIDATION_ERROR', 'Request body must be valid JSON.', 422)
  }
  return schema.parse(input)
}

export function parseParams<T>(input: unknown, schema: ZodType<T>): T {
  return schema.parse(input)
}

function validationMessage(error: ZodError) {
  const issue = error.issues[0]
  if (!issue) return 'Request validation failed.'
  const location = issue.path.length ? `${issue.path.join('.')}: ` : ''
  return `${location}${issue.message}`
}

function errorResponse(error: unknown, id: string) {
  const normalized =
    error instanceof ZodError
      ? new ServiceError('VALIDATION_ERROR', validationMessage(error), 422)
      : isServiceError(error)
        ? error
        : new ServiceError('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500)

  if (normalized.code === 'INTERNAL_ERROR') console.error(`[api:${id}]`, error)
  return Response.json(
    {
      error: {
        code: normalized.code,
        message: normalized.message,
        requestId: id,
      },
    },
    { status: normalized.status, headers: responseHeaders(id) },
  )
}

export async function handleApiRequest<T>(
  request: Request,
  handler: (input: HandlerInput) => Promise<T>,
  options: ApiHandlerOptions = {},
): Promise<Response> {
  const id = requestId()
  try {
    const context = options.authenticated === false ? null : await createBearerServiceContext(request)
    const data = await handler({ context, requestId: id })
    return Response.json(
      { data },
      { status: options.successStatus ?? 200, headers: responseHeaders(id) },
    )
  } catch (error) {
    return errorResponse(error, id)
  }
}
