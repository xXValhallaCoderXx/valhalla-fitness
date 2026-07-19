import type { ApiErrorCode } from '@sheetless/api'

export class ServiceError extends Error {
  readonly code: ApiErrorCode
  readonly status: number

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.status = status
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError
}
