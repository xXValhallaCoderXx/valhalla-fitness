import { useCallback, useEffect, useRef } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandMark, Button, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function AuthLayout({ children, showBack, backDisabled, onBack }: {
  children: React.ReactNode; showBack: boolean; backDisabled: boolean; onBack: () => void
}) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const scroll = useRef<ScrollView>(null)
  const pendingFrame = useRef<number | null>(null)
  const revealFocusedInput = useCallback(() => {
    if (Platform.OS === 'web') return
    if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current)
    // Wait for keyboard avoidance to resize the viewport before native measurement.
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null
      if (!Keyboard.isVisible()) return
      const input = TextInput.State.currentlyFocusedInput()
      if (input) scroll.current?.scrollResponderScrollNativeHandleToKeyboard(input, spacing.lg, true)
    })
  }, [])
  useEffect(() => {
    if (Platform.OS === 'web') return
    const subscription = Keyboard.addListener('keyboardDidShow', revealFocusedInput)
    return () => {
      subscription.remove()
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current)
    }
  }, [revealFocusedInput])

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      onLayout={revealFocusedInput} onFocus={revealFocusedInput} onContentSizeChange={revealFocusedInput}
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }}>
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', flexGrow: 1, paddingHorizontal: spacing.xl, gap: spacing.lg }}>
        {showBack ? <Button label="‹ Back" variant="subtle" disabled={backDisabled} onPress={onBack} accessibilityLabel="Back" />
          : <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <BrandMark size={34} /><Text weight={800} size="lg">Sheetless</Text>
          </View>}
        {children}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
}
