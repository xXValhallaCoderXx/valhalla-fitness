import { errorEnvelopeSchema, type ApiErrorCode } from './contracts'

export class SheetlessApiError extends Error {
  readonly code: ApiErrorCode
  readonly requestId: string | null
  readonly status: number

  constructor(input: { code: ApiErrorCode; message: string; requestId?: string | null; status: number }) {
    super(input.message)
    this.name = 'SheetlessApiError'
    this.code = input.code
    this.requestId = input.requestId ?? null
    this.status = input.status
  }
}

export function parseApiError(payload: unknown, status: number): SheetlessApiError {
  const parsed = errorEnvelopeSchema.safeParse(payload)
  if (parsed.success) {
    return new SheetlessApiError({ ...parsed.data.error, status })
  }
  return new SheetlessApiError({
    code: 'INTERNAL_ERROR',
    message: status === 401 ? 'Your session has expired. Sign in again.' : 'Something went wrong. Please try again.',
    status,
  })
}
