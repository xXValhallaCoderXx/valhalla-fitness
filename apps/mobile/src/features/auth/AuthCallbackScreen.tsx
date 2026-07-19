import { completeAuthCallback } from '@/auth/callback'
import { AppButton } from '@/components/AppButton'
import { AppCard } from '@/components/AppCard'
import { Screen } from '@/components/Screen'
import { useAppTheme } from '@/theme/useAppTheme'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'

type CallbackState = { kind: 'working' } | { kind: 'success' } | { kind: 'error'; message: string }

export function AuthCallbackScreen() {
  const { colors } = useAppTheme()
  const liveUrl = Linking.useURL()
  const handledUrl = useRef<string | null>(null)
  const [state, setState] = useState<CallbackState>({ kind: 'working' })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const url = liveUrl ?? (await Linking.getInitialURL())
      if (!url || handledUrl.current === url) return
      handledUrl.current = url
      setState({ kind: 'working' })
      try {
        await completeAuthCallback(url)
        if (cancelled) return
        setState({ kind: 'success' })
        router.replace('/today')
      } catch (error) {
        if (cancelled) return
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : 'This sign-in link could not be used.',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [liveUrl])

  return (
    <Screen>
      <AppCard>
        {state.kind === 'working' ? (
          <>
            <ActivityIndicator color={colors.actionText} size="large" />
            <Text style={[styles.title, { color: colors.text }]}>Finishing sign-in…</Text>
            <Text style={[styles.body, { color: colors.mutedText }]}>Keep this screen open for a moment.</Text>
          </>
        ) : null}
        {state.kind === 'success' ? (
          <Text style={[styles.title, { color: colors.successText }]}>Signed in. Opening Today…</Text>
        ) : null}
        {state.kind === 'error' ? (
          <>
            <Text accessibilityRole="alert" style={[styles.title, { color: colors.dangerText }]}>That link didn’t work</Text>
            <Text style={[styles.body, { color: colors.mutedText }]}>{state.message}</Text>
            <AppButton label="Request another link" onPress={() => router.replace('/sign-in')} />
          </>
        ) : null}
      </AppCard>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
})
