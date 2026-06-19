import { createSessionCookie, readJsonBody, type ApiRequest, type ApiResponse } from './_lib/auth'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const expected = process.env.APP_PASSWORD
  if (!expected) {
    res.status(500).json({ error: 'APP_PASSWORD is not configured' })
    return
  }

  const body = readJsonBody(req)
  if (body.password !== expected) {
    res.status(401).json({ error: 'Invalid password' })
    return
  }

  res.setHeader('Set-Cookie', await createSessionCookie())
  res.status(200).json({ ok: true })
}
