import { SignJWT, jwtVerify } from 'jose'

export interface ApiRequest {
  method?: string
  body?: unknown
  headers: Record<string, string | string[] | undefined>
}

export interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string | string[]) => void
}

const COOKIE = 'wc_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required')
  return new TextEncoder().encode(secret)
}

export async function createSessionCookie(): Promise<string> {
  const token = await new SignJWT({ scope: 'workout-comeback' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey())

  return `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`
}

function cookieHeader(req: ApiRequest): string {
  const raw = req.headers.cookie
  if (Array.isArray(raw)) return raw.join('; ')
  return raw ?? ''
}

export async function requireAuth(req: ApiRequest): Promise<boolean> {
  const cookies = cookieHeader(req)
  const token = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)

  if (!token) return false
  try {
    await jwtVerify(token, secretKey())
    return true
  } catch {
    return false
  }
}

export function readJsonBody(req: ApiRequest): Record<string, unknown> {
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? (req.body as Record<string, unknown>)
    : {}
}
