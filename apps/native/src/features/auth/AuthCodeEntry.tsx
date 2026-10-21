import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { Button, Caption, Heading, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { AuthLegal } from './AuthLegal'
import { AuthCodeInput } from './AuthCodeInput'
import { openEmailApp } from './open-email'
import type { AuthFlow } from './useAuthFlow'

export function AuthCodeEntry({ auth }: { auth: AuthFlow }) {
  const [emailHelp, setEmailHelp] = useState<string | null>(null)
  const mounted = useRef(false)
  const opening = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const openEmail = async () => {
    if (!mounted.current || opening.current) return
    opening.current = true
    setEmailHelp('Open the newest Sheetless email, then return here and enter its code. Check spam if it has not arrived.')
    try {
      const opened = await openEmailApp()
      if (mounted.current && !opened) setEmailHelp('Open your email app manually, find the newest Sheetless email, then return here and enter its code. You can also check your spam folder.')
    } catch {
      if (mounted.current) setEmailHelp('Your email app could not open. Open it manually, then return here and enter the code.')
    } finally { opening.current = false }
  }

  return <>
    <View style={{ gap: spacing.sm }}>
      <Heading order={1}>Check your email</Heading>
      <Text size="sm" tone="dimmed">We sent a 6-digit code to</Text>
      <Text weight={800} selectable>{auth.sentEmail}</Text>
      <Button label="Change email" variant="subtle" disabled={auth.locked} onPress={auth.back} testID="auth-change-email" />
    </View>
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Sign-in code</SectionLabel>
      <AuthCodeInput value={auth.code} onChange={auth.setCode} disabled={auth.locked} onSubmit={() => void auth.verifyCode()} />
      {auth.error ? <Text tone="danger" size="sm">{auth.error.message}</Text> : null}
      {auth.verified ? <Text tone="success" size="sm">Signed in. Opening Sheetless…</Text> : null}
      <Caption>Enter all six digits to check the code automatically. You can also tap Continue or retry below.</Caption>
      <Button label={auth.error?.action === 'verify' ? 'Retry code' : 'Continue'} fullWidth
        loading={auth.busy === 'verify'} disabled={auth.code.length !== 6 || auth.locked}
        onPress={() => void auth.verifyCode()} testID="auth-verify" />
      <Button label={auth.cooldown > 0 ? `Resend in ${auth.cooldown}s` : 'Resend code'} variant="subtle"
        disabled={auth.cooldown > 0 || auth.locked} loading={auth.busy === 'send'} onPress={() => void auth.sendCode()} testID="auth-resend" />
    </View>
    <Button label="Open your email app" variant="default" fullWidth onPress={() => void openEmail()} testID="auth-open-email" />
    {emailHelp ? <Caption>{emailHelp}</Caption> : null}
    <Caption>Use the most recent code. If it has expired, request another. Your phone may offer to fill it in.</Caption>
    <View style={{ flexGrow: 1, minHeight: spacing.lg }} />
    <AuthLegal />
  </>
}
