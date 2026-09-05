/**
 * OTP sign-in — the native mirror of the web AuthPage (magic-link-only branch),
 * adapted from link-tap to 6-digit code entry. Step 1 collects the email;
 * step 2 is the sent-state with the code input. The root layout's session gate
 * redirects to /(tabs) the moment verifyOtp lands a session.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { Dumbbell, Mail } from 'lucide-react-native'
import { getAuthPolicy } from '@sheetless/domain/shared/auth-config'
import { Button, Caption, Heading, Panel, Screen, SectionLabel, Text, TextInput } from '@/components'
import { getSupabase } from '@/lib/supabase'
import { radii, spacing, useTokens } from '@/lib/tokens'

const RESEND_COOLDOWN_SECONDS = 30

const policy = getAuthPolicy({
  passwordEnabled: process.env.EXPO_PUBLIC_AUTH_PASSWORD_ENABLED,
  allowlistEnabled: process.env.EXPO_PUBLIC_AUTH_ALLOWLIST_ENABLED,
  nodeEnv: __DEV__ ? 'development' : 'production',
})

type Message = { tone: 'danger' | 'success'; text: string } | null

export function AuthScreen() {
  const { theme } = useTokens()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
  }, [])

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS)
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setCooldown((seconds) => {
        if (seconds <= 1 && cooldownTimer.current) clearInterval(cooldownTimer.current)
        return Math.max(0, seconds - 1)
      })
    }, 1000)
  }, [])

  const normalizedEmail = email.trim().toLowerCase()
  const emailValid = /.+@.+\..+/.test(normalizedEmail)

  const sendCode = useCallback(async () => {
    if (!emailValid) {
      setMessage({ tone: 'danger', text: 'Enter a valid email address first.' })
      return
    }
    setBusy('send')
    setMessage(null)
    try {
      const { error } = await getSupabase().auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: policy.magicLinkShouldCreateUser },
      })
      if (error) {
        setMessage({ tone: 'danger', text: error.message })
      } else {
        setSent(true)
        setCode('')
        startCooldown()
      }
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(null)
    }
  }, [emailValid, normalizedEmail, startCooldown])

  const verifyCode = useCallback(async () => {
    if (code.length !== 6) return
    setBusy('verify')
    setMessage(null)
    try {
      const { error } = await getSupabase().auth.verifyOtp({
        email: normalizedEmail,
        token: code,
        type: 'email',
      })
      if (error) setMessage({ tone: 'danger', text: error.message })
      // Success needs no handling here: the session gate redirects to /(tabs).
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(null)
    }
  }, [code, normalizedEmail])

  const backToSignIn = useCallback(() => {
    setSent(false)
    setCode('')
    setMessage(null)
  }, [])

  return (
    <Screen style={{ justifyContent: 'center', minHeight: '100%' }}>
      <Panel style={{ gap: spacing.md, padding: spacing.lg }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.tones.action.soft,
            borderColor: theme.tones.action.border,
            borderRadius: radii.md,
            borderWidth: 1,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
        >
          <Dumbbell size={22} color={theme.tones.action.text} />
        </View>

        {!sent ? (
          <>
            <View style={{ gap: 4 }}>
              <Heading order={1}>Sign in to Sheetless</Heading>
              <Text tone="dimmed" size="sm">
                We'll email you a one-time sign-in code — no password needed.
              </Text>
            </View>

            {message ? (
              <Text tone={message.tone} size="sm">
                {message.text}
              </Text>
            ) : null}

            <View style={{ gap: 6 }}>
              <SectionLabel>Email</SectionLabel>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoFocus
                onSubmitEditing={sendCode}
                testID="auth-email"
              />
            </View>

            <Button
              label="Send code"
              fullWidth
              loading={busy === 'send'}
              disabled={!emailValid}
              onPress={sendCode}
              testID="auth-send"
            />
          </>
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.tones.success.soft,
                  borderRadius: 28,
                  height: 56,
                  justifyContent: 'center',
                  width: 56,
                }}
              >
                <Mail size={28} color={theme.tones.success.text} />
              </View>
              <Heading order={2}>Check your inbox</Heading>
              <Text tone="dimmed" size="sm" align="center">
                We sent a 6-digit code to {normalizedEmail}.
              </Text>
            </View>

            {message ? (
              <Text tone={message.tone} size="sm" align="center">
                {message.text}
              </Text>
            ) : null}

            <TextInput
              value={code}
              onChangeText={(next) => setCode(next.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              autoFocus
              onSubmitEditing={verifyCode}
              inputStyle={{ fontSize: 22, fontWeight: '700', letterSpacing: 6 }}
              testID="auth-code"
            />

            <Button
              label="Verify"
              fullWidth
              loading={busy === 'verify'}
              disabled={code.length !== 6}
              onPress={verifyCode}
              testID="auth-verify"
            />
            <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
              <Button
                label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                variant="subtle"
                disabled={cooldown > 0 || busy !== null}
                onPress={sendCode}
              />
              <Button label="Back to sign in" variant="subtle" tone="neutral" onPress={backToSignIn} />
            </View>
          </>
        )}

        <Caption>
          Didn't get it? Check your spam folder. By continuing you agree to the Terms and
          acknowledge the Privacy Policy.
        </Caption>
      </Panel>
    </Screen>
  )
}
