import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { getSupabase } from '@/lib/supabase'

export type AuthIntent = 'create' | 'signIn'
type AuthStep = 'welcome' | 'identity' | 'code'
type AuthError = { action: 'send' | 'verify'; message: string } | null
const COOLDOWN_MS = 60_000
const normalizeEmail = (value: string) => value.trim().toLowerCase()

/** In-memory auth drafts only; tokens are never persisted or written to logs. */
export function useAuthFlow(allowAccountCreation: boolean) {
  const [step, setStep] = useState<AuthStep>('welcome')
  const [intent, setIntent] = useState<AuthIntent>('create')
  const [email, setEmailValue] = useState('')
  const [firstName, setFirstNameValue] = useState('')
  const [code, setCodeValue] = useState('')
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<AuthError>(null)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(Date.now)
  const mounted = useRef(false)
  const operation = useRef<'send' | 'verify' | 'verified' | null>(null)
  const sendDeadlines = useRef(new Map<string, number>())
  const autoAttempts = useRef(new Set<string>())

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    const updateClock = () => setNow(Date.now())
    const timer = setInterval(updateClock, 1000)
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') updateClock()
    })
    return () => { clearInterval(timer); subscription.remove() }
  }, [])

  const normalizedEmail = normalizeEmail(email)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const locked = busy !== null || verified

  const open = useCallback((next: AuthIntent) => {
    if (!mounted.current || operation.current) return
    setIntent(next)
    setStep('identity')
    setCodeValue('')
    setError(null)
  }, [])

  const back = useCallback(() => {
    if (!mounted.current || operation.current) return
    setStep(current => current === 'code' ? 'identity' : 'welcome')
    setCodeValue('')
    setError(null)
  }, [])

  const setEmail = useCallback((value: string) => {
    if (!mounted.current || operation.current) return
    setEmailValue(value)
    setCooldownUntil(sendDeadlines.current.get(normalizeEmail(value)) ?? 0)
    setNow(Date.now())
    setError(null)
  }, [])

  const setFirstName = useCallback((value: string) => {
    if (!mounted.current || operation.current) return
    setFirstNameValue(value)
  }, [])

  const sendCode = useCallback(async () => {
    if (!mounted.current || operation.current || step === 'welcome') return
    if (!emailValid) {
      setError({ action: 'send', message: 'Enter a valid email address first.' })
      return
    }
    if ((sendDeadlines.current.get(normalizedEmail) ?? 0) > Date.now()) return
    operation.current = 'send'
    setBusy('send')
    setError(null)
    try {
      const name = firstName.trim()
      const { error: failure } = await getSupabase().auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: intent === 'create' && allowAccountCreation,
          ...(intent === 'create' && name ? { data: { full_name: name } } : {}),
        },
      })
      if (!mounted.current) return
      if (failure) throw failure
      const deadline = Date.now() + COOLDOWN_MS
      sendDeadlines.current.set(normalizedEmail, deadline)
      autoAttempts.current.clear()
      setCooldownUntil(deadline)
      setNow(Date.now())
      setSentEmail(normalizedEmail)
      setCodeValue('')
      setStep('code')
    } catch (failure) {
      if (mounted.current) setError({ action: 'send', message: failure instanceof Error ? failure.message : 'Your code could not be sent. Please try again.' })
    } finally {
      if (mounted.current) { operation.current = null; setBusy(null) }
    }
  }, [allowAccountCreation, emailValid, firstName, intent, normalizedEmail, step])

  const verifyValue = useCallback(async (value: string) => {
    if (!mounted.current || operation.current || step !== 'code' || !sentEmail || value.length !== 6) return
    operation.current = 'verify'
    setBusy('verify')
    setError(null)
    try {
      const { data, error: failure } = await getSupabase().auth.verifyOtp({ email: sentEmail, token: value, type: 'email' })
      if (!mounted.current) return
      if (failure) throw failure
      if (!data.session) throw new Error('Your sign-in could not be confirmed. Please try again.')
      // The auth event changes the global session. Keep edits locked until its gate takes over.
      operation.current = 'verified'
      setVerified(true)
    } catch (failure) {
      if (mounted.current) setError({ action: 'verify', message: failure instanceof Error ? failure.message : 'Your code could not be verified. Please try again.' })
    } finally {
      if (mounted.current) {
        if (operation.current !== 'verified') operation.current = null
        setBusy(null)
      }
    }
  }, [sentEmail, step])

  const setCode = useCallback((raw: string) => {
    if (!mounted.current || operation.current) return
    const value = raw.replace(/[^0-9]/g, '').slice(0, 6)
    setCodeValue(value)
    setError(null)
    if (value.length === 6 && !autoAttempts.current.has(value)) {
      autoAttempts.current.add(value)
      void verifyValue(value)
    }
  }, [verifyValue])

  return {
    step, intent, email, firstName, code, sentEmail, busy, verified, locked, error,
    emailValid, cooldown, open, back, setEmail, setFirstName, setCode, sendCode,
    verifyCode: () => verifyValue(code),
  }
}

export type AuthFlow = ReturnType<typeof useAuthFlow>
