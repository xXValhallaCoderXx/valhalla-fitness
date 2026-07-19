import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from '../src/shared/lib/api-error'

describe('API error messages', () => {
  it('uses Error messages', () => {
    expect(getApiErrorMessage(new Error('Unable to finish session'))).toBe('Unable to finish session')
  })

  it('uses ok:false result messages', () => {
    expect(getApiErrorMessage({ ok: false, message: 'Invalid credentials' })).toBe('Invalid credentials')
  })

  it('decodes server-function payloads', () => {
    const encoded = {
      t: 10,
      p: {
        k: ['error'],
        v: [
          {
            t: 10,
            p: {
              k: ['message'],
              v: [{ t: 1, s: 'Session is already finished' }],
            },
          },
        ],
      },
    }

    expect(getApiErrorMessage(encoded)).toBe('Session is already finished')
  })

  it('falls back when no readable message exists', () => {
    expect(getApiErrorMessage({ error: true }, 'Try again later')).toBe('Try again later')
  })
})
