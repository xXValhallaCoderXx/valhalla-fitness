import type { ReactNode } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Heading, SectionLabel } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function RecapActions({ onShare, onDone }: { onShare?: () => void; onDone: () => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
    {onShare ? <Button label="Share" accessibilityLabel="Share workout" variant="default" style={{ flex: 1, minWidth: 120 }} onPress={onShare} /> : null}
    <Button label="Done" style={{ flex: 1, minWidth: 120 }} onPress={onDone} />
  </View>
}

/** Keep the header and actions reachable while the recap scrolls within safe areas. */
export function RecapLayout({ title, eyebrow, children, footer, onClose }: {
  title: string; eyebrow?: string; children: ReactNode; footer: ReactNode; onClose: () => void
}) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  return <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.surface }}>
    <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', padding: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
        <Heading order={2}>{title}</Heading>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close workout recap" onPress={onClose}
        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <X size={22} color={theme.textMuted} />
      </Pressable>
    </View>
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ width: '100%', maxWidth: 560, alignSelf: 'center', padding: spacing.md, paddingTop: spacing.xs, gap: spacing.md }}>
      {children}
    </ScrollView>
    <View style={{ backgroundColor: theme.surface, borderTopWidth: 1, borderColor: theme.border, padding: spacing.md, paddingBottom: spacing.md + insets.bottom }}>
      <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>{footer}</View>
    </View>
  </View>
}
