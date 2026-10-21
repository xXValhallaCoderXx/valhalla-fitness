import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Caption } from './Caption'
import { Heading } from './Heading'
import { SectionLabel } from './SectionLabel'
import { cardShadow, radii, spacing, useTokens } from '@/lib/tokens'

export interface SheetModalProps {
  open: boolean
  title: string
  eyebrow?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
  /** Optional in-sheet navigation for Android Back, after dismissing the keyboard. */
  onBack?: () => void
  closeDisabled?: boolean
  /** Disable when the child owns its scrolling, such as a virtualized movement list. */
  scroll?: boolean
  maxHeight?: number | `${number}%`
  testID?: string
  showHandle?: boolean
  /** Reset the scroll position when a sheet changes to another step or detail. */
  contentKey?: string
}

/** Accessible, keyboard-aware native bottom sheet shared by workout tools. */
export function SheetModal({
  open,
  title,
  eyebrow,
  subtitle,
  children,
  footer,
  onClose,
  onBack,
  closeDisabled = false,
  scroll = true,
  maxHeight = '92%',
  testID,
  showHandle = false,
  contentKey,
}: SheetModalProps) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const close = () => {
    if (!closeDisabled) onClose()
  }
  const requestClose = () => {
    if (Keyboard.isVisible()) Keyboard.dismiss()
    else if (!closeDisabled && onBack) onBack()
    else close()
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
      onRequestClose={requestClose}
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
            {showHandle ? <View accessible={false} style={{ width: 38, height: 4, borderRadius: 2,
              alignSelf: 'center', backgroundColor: theme.border, marginTop: 8 }} /> : null}
            <View
              style={{
                alignItems: 'flex-start',
                borderBottomColor: theme.border,
                borderBottomWidth: showHandle ? 0 : 1,
                flexDirection: 'row',
                flexShrink: 0,
                gap: spacing.sm,
                paddingBottom: showHandle ? 0 : spacing.sm,
                paddingLeft: spacing.lg,
                paddingRight: spacing.sm,
                paddingTop: showHandle ? spacing.xs : spacing.md,
              }}
            >
              <View style={{ flex: 1, gap: 3, minWidth: 0, paddingTop: 4 }}>
                {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
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
                key={contentKey}
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
                  borderTopWidth: showHandle ? 0 : 1,
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
