import { useState } from 'react'
import {
  Platform,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { fontFamily, fontSizes, radii, useTokens } from '@/lib/tokens'
import { Caption } from './Caption'

export interface TextInputProps {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  /** Error message shown under the field; also switches the border to danger. */
  error?: string | null
  keyboardType?: RNTextInputProps['keyboardType']
  autoCapitalize?: RNTextInputProps['autoCapitalize']
  autoComplete?: RNTextInputProps['autoComplete']
  autoFocus?: boolean
  secureTextEntry?: boolean
  maxLength?: number
  multiline?: boolean
  numberOfLines?: number
  textAlign?: TextStyle['textAlign']
  textAlignVertical?: TextStyle['textAlignVertical']
  blurOnSubmit?: RNTextInputProps['blurOnSubmit']
  returnKeyType?: RNTextInputProps['returnKeyType']
  accessibilityLabel?: string
  editable?: boolean
  onSubmitEditing?: () => void
  containerStyle?: StyleProp<ViewStyle>
  inputStyle?: StyleProp<TextStyle>
  testID?: string
}

/** Controlled text input with the web app's focus/error treatment. */
export function TextInput({
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  autoFocus,
  secureTextEntry,
  maxLength,
  multiline,
  numberOfLines,
  textAlign,
  textAlignVertical,
  blurOnSubmit,
  returnKeyType,
  accessibilityLabel,
  editable = true,
  onSubmitEditing,
  containerStyle,
  inputStyle,
  testID,
}: TextInputProps) {
  const { theme } = useTokens()
  const [focused, setFocused] = useState(false)
  const borderColor = error ? theme.tones.danger.text : focused ? theme.focusOutline : theme.border

  return (
    <View style={[{ gap: 4 }, containerStyle]}>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={textAlignVertical}
        blurOnSubmit={blurOnSubmit}
        returnKeyType={returnKeyType}
        accessibilityLabel={accessibilityLabel}
        editable={editable}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testID}
        style={[
          {
            backgroundColor: theme.inputBackground,
            borderColor,
            borderRadius: radii.md,
            borderWidth: 1,
            color: theme.text,
            fontFamily,
            fontSize: fontSizes.md,
            minHeight: 40,
            paddingHorizontal: 12,
            paddingVertical: 8,
            textAlign,
            textAlignVertical,
          },
          // Focus-ring halo only exists as box-shadow; native gets border swap only.
          Platform.OS === 'web' && focused && !error
            ? ({ boxShadow: `0 0 0 2px ${theme.focusRing}`, outlineWidth: 0 } as TextStyle)
            : null,
          inputStyle,
        ]}
      />
      {error ? <Caption tone="danger">{error}</Caption> : null}
    </View>
  )
}
