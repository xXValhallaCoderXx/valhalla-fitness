import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { Heading, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { focusedInputScrollOffset } from './focused-input-scroll'

export function SettingsPage({ title, children, footer, onBack, scrollToY }: {
  title: string; children: ReactNode; footer?: ReactNode; onBack?: () => void; scrollToY?: number
}) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const scroll = useRef<ScrollView>(null)
  const content = useRef<View>(null)
  const scrollOffset = useRef(0)
  const focused = useRef(false)
  const keyboardFrame = useRef<number | null>(null)
  const measurement = useRef(0)
  const revealInput = useCallback(() => {
    if (Platform.OS === 'web') return
    const request = ++measurement.current
    if (keyboardFrame.current !== null) cancelAnimationFrame(keyboardFrame.current)
    keyboardFrame.current = requestAnimationFrame(() => {
      keyboardFrame.current = null
      if (!focused.current || !Keyboard.isVisible()) return
      const input = TextInput.State.currentlyFocusedInput()
      const inner = content.current
      const viewport = scroll.current?.getNativeScrollRef()
      if (!input || !inner || !viewport) return
      viewport.measureInWindow((_left, top, _width, height) => {
        const keyboardTop = Keyboard.metrics()?.screenY
        const viewportHeight = keyboardTop === undefined ? height : Math.min(height, keyboardTop - top)
        // measureLayout uses a native ancestor, so a focused input in a separate
        // modal cannot scroll this page underneath it. The viewport excludes the
        // header and fixed footer, unlike RN's whole-screen keyboard helper.
        input.measureLayout(inner, (_x, inputTop, _inputWidth, inputHeight) => {
          if (request !== measurement.current || !focused.current || !Keyboard.isVisible() ||
            TextInput.State.currentlyFocusedInput() !== input) return
          const y = focusedInputScrollOffset({ inputTop, inputHeight, viewportHeight,
            scrollOffset: scrollOffset.current, padding: spacing.lg })
          if (y !== null) scroll.current?.scrollTo({ y, animated: false })
        }, () => undefined)
      })
    })
  }, [])
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return
    focused.current = true
    const listener = Keyboard.addListener('keyboardDidShow', revealInput)
    return () => {
      focused.current = false
      measurement.current += 1
      listener.remove()
      if (keyboardFrame.current !== null) cancelAnimationFrame(keyboardFrame.current)
    }
  }, [revealInput]))
  useEffect(() => {
    if (scrollToY === undefined) return
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: scrollToY, animated: true }))
    return () => cancelAnimationFrame(frame)
  }, [scrollToY])
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.background }}>
    {onBack ? <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to You"
      style={{ minHeight: 48, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <ChevronLeft size={20} color={theme.text} /><Text size="sm" weight={700}>You</Text>
    </Pressable> : null}
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      onLayout={revealInput} onFocus={revealInput} onContentSizeChange={revealInput}
      onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y }} scrollEventThrottle={16}>
      <View ref={content} collapsable={false} style={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl }}>
        <Heading order={1}>{title}</Heading>
        {children}
      </View>
    </ScrollView>
    {footer}
  </KeyboardAvoidingView>
}
