import { View } from 'react-native'
import { Button, Caption, Heading, SectionLabel, Text, TextInput } from '@/components'
import { spacing } from '@/lib/tokens'
import { AuthLegal } from './AuthLegal'
import type { AuthFlow } from './useAuthFlow'

export function AuthIdentityForm({ auth }: { auth: AuthFlow }) {
  const creating = auth.intent === 'create'
  return <>
    <View style={{ gap: spacing.sm }}>
      <Heading order={1}>{creating ? 'Create your account' : 'Welcome back'}</Heading>
      <Text size="sm" tone="dimmed">{creating
        ? 'We will email you a 6-digit code. There is no password to remember.'
        : 'Enter the email you signed up with and we will send you a code.'}</Text>
    </View>
    <View style={{ gap: spacing.lg }}>
      {creating ? <View style={{ gap: spacing.xs }}>
        <SectionLabel>First name · optional</SectionLabel>
        <TextInput value={auth.firstName} onChangeText={auth.setFirstName} autoCapitalize="words"
          autoComplete="given-name" textContentType="givenName" accessibilityLabel="First name, optional"
          editable={!auth.locked} maxLength={80} placeholder="Your first name" testID="auth-first-name" />
      </View> : null}
      <View style={{ gap: spacing.xs }}>
        <SectionLabel>Email</SectionLabel>
        <TextInput value={auth.email} onChangeText={auth.setEmail} placeholder="you@example.com"
          keyboardType="email-address" autoComplete="email" textContentType="emailAddress" accessibilityLabel="Email address"
          autoCorrect={false} editable={!auth.locked} returnKeyType="send"
          onSubmitEditing={() => void auth.sendCode()} testID="auth-email" />
      </View>
      {auth.error ? <Text tone="danger" size="sm">{auth.error.message}</Text> : null}
      <Caption>By continuing you agree to the Terms and acknowledge the Privacy Policy.</Caption>
      <AuthLegal />
    </View>
    <View style={{ flexGrow: 1, minHeight: spacing.lg }} />
    <Button label={auth.cooldown > 0 ? `Send again in ${auth.cooldown}s` : auth.error ? 'Retry sending code' : 'Send my code'}
      fullWidth size="lg" loading={auth.busy === 'send'} disabled={!auth.emailValid || auth.locked || auth.cooldown > 0}
      onPress={() => void auth.sendCode()} testID="auth-send" />
    <View style={{ alignItems: 'center' }}>
      <Text size="sm" tone="dimmed">{creating ? 'Already have an account?' : 'New to Sheetless?'}</Text>
      <Button label={creating ? 'Sign in' : 'Create an account'} variant="subtle" disabled={auth.locked} style={{ alignSelf: 'center' }}
        onPress={() => auth.open(creating ? 'signIn' : 'create')} />
    </View>
  </>
}
