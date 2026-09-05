import { Pressable, ScrollView, Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native'
import { fontFamily, fontSizes, radii, spacing, useTokens } from '@/lib/tokens'
import { SectionLabel } from './SectionLabel'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
  testID?: string
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedControlOption<T>>
  value: T | null
  onChange: (value: T) => void
  /**
   * pills = hug-width chips in a horizontal scroller, for lists that outgrow the
   * screen (tabs, filters, week pickers) · segments = equal-width row that never
   * scrolls, for a closed set of 2-4 choices (units, rounding, theme).
   */
  variant?: 'pills' | 'segments'
  /** Optional SectionLabel above the row. */
  label?: string
  disabled?: boolean
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
}

/**
 * Single-select row of segments — the one control behind the app's tab strips,
 * filter chips, and settings choices. Replaces the hand-rolled
 * `<ScrollView horizontal>{Buttons}</ScrollView>` those surfaces each grew.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'pills',
  label,
  disabled = false,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const { theme } = useTokens()

  const segments = options.map((option) => {
    const selected = option.value === value
    const inactive = disabled || Boolean(option.disabled)
    return (
      <Pressable
        key={option.value}
        accessibilityRole="tab"
        accessibilityState={{ disabled: inactive, selected }}
        disabled={inactive}
        onPress={() => onChange(option.value)}
        testID={option.testID}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: selected ? theme.primaryFill : theme.surface,
          borderColor: selected ? theme.primaryFill : theme.border,
          borderRadius: radii.md,
          borderWidth: 1,
          // A closed set shares the width evenly; a scrolling row hugs its label.
          flex: variant === 'segments' ? 1 : undefined,
          justifyContent: 'center',
          // 44 is the platform minimum touch target. The catalogue filters and
          // movement picker already opted into it by hand; this applies it to
          // every segment instead.
          minHeight: 44,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          paddingHorizontal: variant === 'segments' ? spacing.xs : spacing.md,
          paddingVertical: 8,
        })}
      >
        <RNText
          numberOfLines={1}
          style={{
            color: selected ? theme.primaryFillText : theme.text,
            fontFamily,
            fontSize: fontSizes.md,
            fontWeight: '800',
          }}
        >
          {option.label}
        </RNText>
      </Pressable>
    )
  })

  return (
    <View
      // The group identity lives on one container node, not on the scroll
      // viewport — a ScrollView is a viewport, and react-native-web renders it
      // as two nested elements, which would announce the group twice.
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[label ? { gap: spacing.xs } : null, style]}
    >
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      {variant === 'segments' ? (
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>{segments}</View>
      ) : (
        <ScrollView
          horizontal
          // Without this, the first tap after typing in an adjacent search field
          // only dismisses the keyboard instead of selecting.
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: 1 }}
        >
          {segments}
        </ScrollView>
      )}
    </View>
  )
}
