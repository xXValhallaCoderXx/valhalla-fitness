const defaultApiErrorMessage = 'Something went wrong. Please try again.'

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstReadableString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function decodeServerValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return value
  if (Array.isArray(value)) return value.map((item) => decodeServerValue(item, depth + 1))
  if (!isRecord(value)) return value

  if (typeof value.s === 'string') return value.s

  const payload = value.p
  if (isRecord(payload) && Array.isArray(payload.k) && Array.isArray(payload.v)) {
    const keys = payload.k
    const values = payload.v
    const decoded: JsonRecord = {}
    keys.forEach((key, index) => {
      if (typeof key === 'string') decoded[key] = decodeServerValue(values[index], depth + 1)
    })
    return decoded
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, decodeServerValue(nestedValue, depth + 1)]),
  )
}

function isServerEncodedValue(value: unknown) {
  if (!isRecord(value)) return false
  if (typeof value.s === 'string') return true
  const payload = value.p
  return isRecord(payload) && Array.isArray(payload.k) && Array.isArray(payload.v)
}

export function getApiErrorMessage(error: unknown, fallback = defaultApiErrorMessage): string {
  const directMessage = firstReadableString(error)
  if (directMessage) return directMessage

  if (error instanceof Error) {
    return getApiErrorMessage(error.cause, error.message || fallback)
  }

  if (!isRecord(error)) return fallback

  if (isServerEncodedValue(error)) {
    const decoded = decodeServerValue(error)
    const decodedMessage = getApiErrorMessage(decoded, '')
    if (decodedMessage) return decodedMessage
  }

  const recordMessage = firstReadableString(
    error.message,
    error.error_description,
    error.errorDescription,
    error.statusText,
  )
  if (recordMessage) return recordMessage

  if (typeof error.error === 'string') return error.error
  if (isRecord(error.error)) return getApiErrorMessage(error.error, fallback)
  if (isRecord(error.cause)) return getApiErrorMessage(error.cause, fallback)
  if (isRecord(error.result) && error.result.ok === false) return getApiErrorMessage(error.result, fallback)

  return fallback
}
