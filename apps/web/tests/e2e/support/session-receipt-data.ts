import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@sheetless/domain/shared/types/database'
import { startSession } from '@sheetless/data/session/lifecycle'
import { getSession } from '@sheetless/data/session/reads'
import { finishSession } from '@sheetless/data/session/completion'
import { upsertSetLog } from '@sheetless/data/session/sets'

// Run with tsx outside Playwright's ESM loader. Credentials arrive on stdin only.
const input = JSON.parse(readFileSync(0, 'utf8')) as {
  action: 'start' | 'finish'; apiUrl: string; anonKey: string
  email: string; password: string; sessionId?: string
}
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(input.apiUrl)) throw new Error('Local Supabase required')
const supabase = createClient<Database>(input.apiUrl, input.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const auth = await supabase.auth.signInWithPassword({ email: input.email, password: input.password })
if (auth.error || !auth.data.user) throw auth.error ?? new Error('Missing fixture user')
const ctx = { supabase, user: auth.data.user }
if (input.action === 'start') {
  const session = await startSession(ctx, { clientMutationId: crypto.randomUUID(), timeZone: 'UTC' })
  process.stdout.write(JSON.stringify(session))
} else {
  if (!input.sessionId) throw new Error('Missing fixture session')
  let session = await getSession(ctx, input.sessionId)
  for (const movement of session.movements) {
    for (const set of movement.sets) {
      session = await upsertSetLog(ctx, {
        sessionId: session.sessionId, exerciseLogId: movement.id, setIndex: set.setIndex,
        actualLoad: set.targetLoad ?? 20, actualReps: set.targetReps ?? set.targetRepMax ?? 8,
        actualRir: 3, completed: true, clientMutationId: crypto.randomUUID(),
        expectedStateVersion: session.stateVersion,
      })
    }
  }
  const summary = await finishSession(ctx, { sessionId: session.sessionId, requestId: crypto.randomUUID() })
  process.stdout.write(JSON.stringify(summary))
}
