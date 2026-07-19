import { api } from '@/api/client'
import { supabase } from '@/auth/supabase'
import { AppButton } from '@/components/AppButton'
import { AppCard } from '@/components/AppCard'
import { Screen } from '@/components/Screen'
import { useAppTheme } from '@/theme/useAppTheme'
import { radius, spacing, typography } from '@sheetless/tokens'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; message: string }
  | { kind: 'error'; message: string }

export function SignInScreen() {
  const { colors } = useAppTheme()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })

  const send = async () => {
    setState({ kind: 'sending' })
    try {
      const intent = await api.magicLinkIntent({ email: email.trim() })
      if (intent.shouldSend) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: 'sheetless://auth/callback',
            shouldCreateUser: intent.shouldCreateUser,
          },
        })
        if (error) throw error
      }
      setState({ kind: 'sent', message: intent.message })
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The magic link could not be sent.',
      })
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <Screen>
        <View style={styles.hero}>
          <View style={[styles.mark, { backgroundColor: colors.brandMark }]}>
            <Text style={[styles.markText, { color: colors.brandMarkText }]}>S</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Sheetless</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>Your workout. No spreadsheet required.</Text>
        </View>

        <AppCard>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Sign in with a magic link</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>We’ll email a secure link that opens this app.</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedText}
            style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text }]}
            value={email}
          />
          <AppButton
            disabled={!email.trim()}
            label="Email me a sign-in link"
            loading={state.kind === 'sending'}
            onPress={() => void send()}
          />
          {state.kind === 'sent' ? (
            <Text accessibilityRole="alert" style={[styles.feedback, { color: colors.successText }]}>{state.message}</Text>
          ) : null}
          {state.kind === 'error' ? (
            <Text accessibilityRole="alert" style={[styles.feedback, { color: colors.dangerText }]}>{state.message}</Text>
          ) : null}
        </AppCard>
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hero: { alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 44 },
  mark: { alignItems: 'center', borderRadius: 16, height: 58, justifyContent: 'center', width: 58 },
  markText: { fontSize: 28, fontWeight: '900' },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 15, textAlign: 'center' },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  body: { fontSize: typography.fontSize.md, lineHeight: 20 },
  input: { borderRadius: radius.md, borderWidth: 1, fontSize: 17, minHeight: 52, paddingHorizontal: spacing.md },
  feedback: { fontSize: typography.fontSize.md, fontWeight: '600', lineHeight: 20 },
})
