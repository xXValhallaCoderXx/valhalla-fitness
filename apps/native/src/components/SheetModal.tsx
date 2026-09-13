import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Caption } from './Caption'
import { Heading } from './Heading'
import { cardShadow, radii, spacing, useTokens } from '@/lib/tokens'

export interface SheetModalProps {
  open: boolean
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
  closeDisabled?: boolean
  /** Disable when the child owns its scrolling, such as a virtualized movement list. */
  scroll?: boolean
  maxHeight?: number | `${number}%`
  testID?: string
}

/** Accessible, keyboard-aware native bottom sheet shared by workout tools. */
export function SheetModal({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  closeDisabled = false,
  scroll = true,
  maxHeight = '92%',
  testID,
}: SheetModalProps) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const close = () => {
    if (!closeDisabled) onClose()
  }
  const content = (
    <View style={{ flexShrink: scroll ? 0 : 1, gap: spacing.md, minHeight: 0, padding: spacing.lg }}>
      {children}
    </View>
  )

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={{ backgroundColor: 'rgba(6, 12, 14, 0.6)', flex: 1 }}>
        {/* The backdrop must not compete with the sheet's scrolling responder. */}
        <Pressable
          accessible={false}
          disabled={closeDisabled}
          onPress={close}
          style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
        />
        <KeyboardAvoidingView
          // Android's edge-to-edge Modal can keep full height despite adjustResize.
          behavior={Platform.select({ ios: 'padding', android: 'height' })}
          pointerEvents="box-none"
          style={{ flex: 1, justifyContent: 'flex-end', paddingTop: insets.top + spacing.lg }}
        >
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={close}
            testID={testID}
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.cardBorder,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              borderWidth: 1,
              flexShrink: 1,
              maxHeight,
              minHeight: 0,
              overflow: 'hidden',
              ...cardShadow(theme),
            }}
          >
            <View
              style={{
                alignItems: 'flex-start',
                borderBottomColor: theme.border,
                borderBottomWidth: 1,
                flexDirection: 'row',
                flexShrink: 0,
                gap: spacing.sm,
                paddingBottom: spacing.sm,
                paddingLeft: spacing.lg,
                paddingRight: spacing.sm,
                paddingTop: spacing.md,
              }}
            >
              <View style={{ flex: 1, gap: 3, minWidth: 0, paddingTop: 4 }}>
                <Heading order={2}>{title}</Heading>
                {subtitle ? <Caption>{subtitle}</Caption> : null}
              </View>
              <Pressable
                accessibilityLabel={`Close ${title}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: closeDisabled }}
                disabled={closeDisabled}
                hitSlop={4}
                onPress={close}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  borderRadius: 22,
                  height: 44,
                  justifyContent: 'center',
                  opacity: closeDisabled ? 0.35 : pressed ? 0.6 : 1,
                  width: 44,
                })}
              >
                <X color={theme.textMuted} size={22} />
              </Pressable>
            </View>

            {scroll ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }}
                contentContainerStyle={{ paddingBottom: footer ? 0 : spacing.lg + insets.bottom }}
              >
                {content}
              </ScrollView>
            ) : (
              content
            )}

            {footer ? (
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderTopColor: theme.border,
                  borderTopWidth: 1,
                  flexShrink: 0,
                  padding: spacing.md,
                  paddingBottom: spacing.md + insets.bottom,
                }}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
