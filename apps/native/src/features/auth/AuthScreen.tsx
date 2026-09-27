import { useEffect } from 'react'
import { BackHandler, Keyboard, Platform } from 'react-native'
import { usePreventRemove } from 'expo-router/react-navigation'
import { getAuthPolicy } from '@sheetless/domain/shared/auth-config'
import { AuthLayout } from './AuthLayout'
import { AuthWelcome } from './AuthWelcome'
import { AuthIdentityForm } from './AuthIdentityForm'
import { AuthCodeEntry } from './AuthCodeEntry'
import { useAuthFlow } from './useAuthFlow'

const policy = getAuthPolicy({
  passwordEnabled: process.env.EXPO_PUBLIC_AUTH_PASSWORD_ENABLED,
  allowlistEnabled: process.env.EXPO_PUBLIC_AUTH_ALLOWLIST_ENABLED,
  nodeEnv: __DEV__ ? 'development' : 'production',
})

/** The root session gate owns all navigation after successful verification. */
export function AuthScreen() {
  const auth = useAuthFlow(policy.magicLinkShouldCreateUser)
  const { back, locked, step } = auth
  usePreventRemove(auth.busy === 'verify', () => {})

  useEffect(() => {
    if (Platform.OS === 'web') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Keyboard.isVisible()) { Keyboard.dismiss(); return true }
      if (locked) return true
      if (step === 'welcome') return false
      back()
      return true
    })
    return () => subscription.remove()
  }, [back, locked, step])

  return <AuthLayout key={`${auth.step}-${auth.intent}`} showBack={auth.step !== 'welcome'} backDisabled={auth.locked} onBack={auth.back}>
    {auth.step === 'welcome' ? <AuthWelcome onCreate={() => auth.open('create')} onSignIn={() => auth.open('signIn')} />
      : auth.step === 'code' ? <AuthCodeEntry auth={auth} />
        : <AuthIdentityForm auth={auth} />}
  </AuthLayout>
}
