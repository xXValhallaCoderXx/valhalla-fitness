/**
 * Supabase auth spike screen (gate 2): email OTP sign-in, session panel with
 * live expiry countdown, provable refresh, sign-out, persistence proof, and an
 * on-screen event log so errors are visible without a debugger.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, storageBackendLabel } from '@/lib/supabase'

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })
const MAX_LOG_LINES = 60

function timeOfDay(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'expired'
  const total = Math.floor(msRemaining / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`
}

function tokenPreview(token: string): string {
  if (token.length <= 16) return token
  return `${token.slice(0, 8)}…${token.slice(-8)}`
}

export default function AuthScreen() {
  const scheme = useColorScheme()
  const c = scheme === 'light' ? light : dark

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState<'send' | 'verify' | 'refresh' | 'signout' | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const [initError, setInitError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [refreshProof, setRefreshProof] = useState<string | null>(null)
  const logSeq = useRef(0)

  const log = useCallback((line: string) => {
    logSeq.current += 1
    const stamped = `${timeOfDay(Date.now())} #${logSeq.current} ${line}`
    setLogLines((prev) => [stamped, ...prev].slice(0, MAX_LOG_LINES))
  }, [])

  /** Get the client, surfacing config errors on screen instead of crashing. */
  const sb = useCallback(() => {
    try {
      return getSupabase()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setInitError(msg)
      log(`INIT ERROR: ${msg}`)
      return null
    }
  }, [log])

  // Mount: current session + auth event subscription.
  useEffect(() => {
    const client = sb()
    if (!client) return
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          log(`getSession error: ${error.message}`)
        } else {
          setSession(data.session)
          log(data.session ? `getSession: session for ${data.session.user.email ?? '?'}` : 'getSession: no session')
        }
      })
      .catch((err: unknown) => log(`getSession threw: ${err instanceof Error ? err.message : String(err)}`))

    const { data: sub } = client.auth.onAuthStateChange((event, next) => {
      setSession(next)
      log(`auth event: ${event}${next ? ` (expires ${next.expires_at ? timeOfDay(next.expires_at * 1000) : '?'})` : ''}`)
    })
    return () => sub.subscription.unsubscribe()
  }, [sb, log])

  // 1s tick for the live countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : null
  const countdown = useMemo(
    () => (expiresAtMs === null ? null : formatCountdown(expiresAtMs - now)),
    [expiresAtMs, now],
  )

  const sendCode = useCallback(async () => {
    const client = sb()
    if (!client) return
    const target = email.trim().toLowerCase()
    if (!target.includes('@')) {
      log('send: enter a valid email first')
      return
    }
    setBusy('send')
    try {
      const { error } = await client.auth.signInWithOtp({
        email: target,
        options: { shouldCreateUser: true },
      })
      if (error) {
        log(`signInWithOtp ERROR: ${error.message}`)
      } else {
        setCodeSent(true)
        log(`signInWithOtp: code sent to ${target} (check Mailpit at :54324 for local stacks)`)
      }
    } catch (err) {
      log(`signInWithOtp threw: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
    }
  }, [email, sb, log])

  const verifyCode = useCallback(async () => {
    const client = sb()
    if (!client) return
    const target = email.trim().toLowerCase()
    const token = code.trim()
    if (token.length !== 6) {
      log('verify: enter the 6-digit code')
      return
    }
    setBusy('verify')
    try {
      const { data, error } = await client.auth.verifyOtp({ email: target, token, type: 'email' })
      if (error) {
        log(`verifyOtp ERROR: ${error.message}`)
      } else {
        log(`verifyOtp OK: user ${data.user?.id ?? '?'}`)
        setCode('')
        setCodeSent(false)
      }
    } catch (err) {
      log(`verifyOtp threw: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
    }
  }, [email, code, sb, log])

  const refreshSession = useCallback(async () => {
    const client = sb()
    if (!client) return
    const oldExp = session?.expires_at ? timeOfDay(session.expires_at * 1000) : '?'
    setBusy('refresh')
    try {
      const { data, error } = await client.auth.refreshSession()
      if (error) {
        log(`refreshSession ERROR: ${error.message}`)
      } else {
        const newExp = data.session?.expires_at ? timeOfDay(data.session.expires_at * 1000) : '?'
        const proof = `old expiry ${oldExp} → new expiry ${newExp}`
        setRefreshProof(proof)
        log(`refreshSession OK: ${proof}`)
      }
    } catch (err) {
      log(`refreshSession threw: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
    }
  }, [session, sb, log])

  const signOut = useCallback(async () => {
    const client = sb()
    if (!client) return
    setBusy('signout')
    try {
      const { error } = await client.auth.signOut()
      if (error) log(`signOut ERROR: ${error.message}`)
      else {
        setRefreshProof(null)
        log('signOut OK')
      }
    } catch (err) {
      log(`signOut threw: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
    }
  }, [sb, log])

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: c.text }]}>Supabase auth spike</Text>
      <Text style={[styles.dim, { color: c.dim }]}>Email OTP · session persistence · token refresh</Text>

      {initError ? (
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.danger }]}>
          <Text style={[styles.cardTitle, { color: c.danger }]}>Configuration error</Text>
          <Text style={[styles.mono, { color: c.text }]}>{initError}</Text>
        </View>
      ) : null}

      {session ? (
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.success }]}>Signed in</Text>
          <Row label="email" value={session.user.email ?? '(none)'} c={c} />
          <Row label="user id" value={session.user.id} c={c} />
          <Row
            label="expires"
            value={`${expiresAtMs ? timeOfDay(expiresAtMs) : '?'} (${countdown ?? '?'})`}
            c={c}
          />
          <Row label="access token" value={tokenPreview(session.access_token)} c={c} />
          {refreshProof ? <Row label="last refresh" value={refreshProof} c={c} /> : null}

          <View style={styles.buttonRow}>
            <Button
              label={busy === 'refresh' ? 'Refreshing…' : 'Refresh session'}
              onPress={refreshSession}
              disabled={busy !== null}
              c={c}
            />
            <Button
              label={busy === 'signout' ? 'Signing out…' : 'Sign out'}
              onPress={signOut}
              disabled={busy !== null}
              variant="secondary"
              c={c}
            />
          </View>

          <Text style={[styles.note, { color: c.dim }]}>
            Kill and reopen the app — this panel should still show your session.
          </Text>
          <Text style={[styles.note, { color: c.dim }]}>Storage backend: {storageBackendLabel}</Text>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Sign in with email code</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.inputBg }]}
            placeholder="you@example.com"
            placeholderTextColor={c.dim}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={busy === null}
          />
          <Button
            label={busy === 'send' ? 'Sending…' : codeSent ? 'Resend code' : 'Send code'}
            onPress={sendCode}
            disabled={busy !== null || email.trim().length === 0}
            c={c}
          />

          {codeSent ? (
            <View style={styles.codeBlock}>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  { color: c.text, borderColor: c.border, backgroundColor: c.inputBg },
                ]}
                placeholder="123456"
                placeholderTextColor={c.dim}
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                editable={busy === null}
              />
              <Button
                label={busy === 'verify' ? 'Verifying…' : 'Verify'}
                onPress={verifyCode}
                disabled={busy !== null || code.trim().length !== 6}
                c={c}
              />
              <Text style={[styles.note, { color: c.dim }]}>
                Local stack: the code lands in Mailpit at http://127.0.0.1:54324
              </Text>
            </View>
          ) : null}

          <Text style={[styles.note, { color: c.dim }]}>Storage backend: {storageBackendLabel}</Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Auth log</Text>
        {logLines.length === 0 ? (
          <Text style={[styles.mono, { color: c.dim }]}>(no events yet)</Text>
        ) : (
          logLines.map((line) => (
            <Text
              key={line}
              style={[styles.mono, { color: line.includes('ERROR') || line.includes('threw') ? c.danger : c.dim }]}
            >
              {line}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  )
}

type Palette = typeof dark

function Row({ label, value, c }: { label: string; value: string; c: Palette }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.dim }]}>{label}</Text>
      <Text style={[styles.mono, styles.rowValue, { color: c.text }]} selectable>
        {value}
      </Text>
    </View>
  )
}

function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  c,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  c: Palette
}) {
  const bg = variant === 'primary' ? c.accent : c.inputBg
  const fg = variant === 'primary' ? c.accentText : c.text
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: c.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

const dark = {
  bg: '#0b0f14',
  card: '#151b23',
  inputBg: '#0f141b',
  border: '#2a3441',
  text: '#e6edf3',
  dim: '#8b98a5',
  accent: '#3b82f6',
  accentText: '#ffffff',
  danger: '#f87171',
  success: '#4ade80',
}

const light: Palette = {
  bg: '#f5f7fa',
  card: '#ffffff',
  inputBg: '#f0f3f7',
  border: '#d4dae2',
  text: '#111827',
  dim: '#5b6572',
  accent: '#2563eb',
  accentText: '#ffffff',
  danger: '#dc2626',
  success: '#15803d',
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700' },
  dim: { fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  codeBlock: { gap: 8, marginTop: 4 },
  codeInput: { fontFamily: MONO, letterSpacing: 6, fontSize: 18, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    flexGrow: 1,
  },
  buttonLabel: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  rowLabel: { fontSize: 12, width: 88, paddingTop: 1 },
  rowValue: { flex: 1 },
  mono: { fontFamily: MONO, fontSize: 11, lineHeight: 16 },
  note: { fontSize: 12, marginTop: 2 },
})
