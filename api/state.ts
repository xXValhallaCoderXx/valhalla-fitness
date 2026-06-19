import { Redis } from '@upstash/redis'
import { readJsonBody, requireAuth, type ApiRequest, type ApiResponse } from './_lib/auth'

const redis = Redis.fromEnv()
const STATE_KEY = process.env.STATE_KEY ?? 'workout-comeback:state'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!(await requireAuth(req))) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (req.method === 'GET') {
    const state = await redis.get(STATE_KEY)
    res.status(200).json({ state: state ?? null })
    return
  }

  if (req.method === 'PUT') {
    const body = readJsonBody(req)
    if (!body.state || typeof body.state !== 'object') {
      res.status(400).json({ error: 'Missing state document' })
      return
    }
    await redis.set(STATE_KEY, body.state)
    res.status(200).json({ ok: true })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
