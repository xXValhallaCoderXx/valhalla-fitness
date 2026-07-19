import { describe, expect, it } from 'vitest'
import { readBearerToken } from '../src/shared/server/service-context'
import { handleApiRequest } from '../src/shared/server/api-route'

describe('mobile API authentication boundary', () => {
  it('rejects missing and malformed bearer headers with the stable envelope', async () => {
    const missing = await handleApiRequest(new Request('http://localhost/api/v1/me'), async () => null)
    expect(missing.status).toBe(401)
    await expect(missing.json()).resolves.toMatchObject({ error: { code: 'UNAUTHENTICATED' } })

    const malformed = new Request('http://localhost/api/v1/me', { headers: { Authorization: 'Basic abc' } })
    const response = await handleApiRequest(malformed, async () => null)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
  })

  it('extracts a well-formed bearer token without accepting extra fields', () => {
    expect(readBearerToken(new Request('http://localhost', { headers: { Authorization: 'Bearer jwt-value' } }))).toBe('jwt-value')
    expect(() => readBearerToken(new Request('http://localhost', { headers: { Authorization: 'Bearer one two' } }))).toThrow()
  })
})
