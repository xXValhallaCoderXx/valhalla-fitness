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
    <>
      <View style={{ gap: spacing.md, padding: spacing.lg }}>{children}</View>
    </>
  )

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={close}
    >
      <Pressable
        accessible={false}
        onPress={closeDisabled ? undefined : onClose}
        style={{ backgroundColor: 'rgba(6, 12, 14, 0.6)', flex: 1, justifyContent: 'flex-end' }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={{ flex: 1, justifyContent: 'flex-end', paddingTop: insets.top + spacing.lg }}
        >
          <Pressable accessible={false} onPress={() => {}} style={{ cursor: 'auto' }}>
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
                maxHeight,
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
                  onPress={onClose}
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
                  contentContainerStyle={{ paddingBottom: footer ? 0 : spacing.lg + insets.bottom }}
                >
                  {content}
                </ScrollView>
              ) : (
                <View style={{ flexShrink: 1 }}>{content}</View>
              )}

              {footer ? (
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    borderTopWidth: 1,
                    padding: spacing.md,
                    paddingBottom: spacing.md + insets.bottom,
                  }}
                >
                  {footer}
                </View>
              ) : null}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}
