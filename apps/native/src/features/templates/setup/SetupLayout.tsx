import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from 'expo-router/react-navigation'
import { Heading, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { nativeSetupSteps, type NativeSetupStep } from '@sheetless/domain/program/native-setup-draft'

export function SetupLayout({ title, step, footer, children }: { title: string; step: NativeSetupStep; footer: ReactNode; children: ReactNode }) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  // Keyboard coordinates are screen-relative; this layout starts below the native header.
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={headerHeight}
    style={{ flex: 1, backgroundColor: theme.background }}>
    <View style={{ padding: spacing.md, gap: spacing.xs, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <SectionLabel>Set up your plan · {nativeSetupSteps.indexOf(step) + 1} of 4</SectionLabel>
      <Heading order={2}>{title}</Heading>
      <Text size="sm" tone="dimmed">Schedule → Numbers → Equipment → Review</Text>
    </View>
    <ScrollView key={step} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      {children}
    </ScrollView>
    <View style={{ padding: spacing.md, paddingBottom: spacing.md + insets.bottom, borderTopWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
      <View style={{ maxWidth: 560, width: '100%', alignSelf: 'center', gap: spacing.xs }}>{footer}</View>
    </View>
  </KeyboardAvoidingView>
}
