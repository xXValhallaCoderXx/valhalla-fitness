import { Image, View } from 'react-native'
import { radii, useTokens } from '@/lib/tokens'
import mark from '../../assets/images/sheetless-mark.png'

export interface BrandMarkProps {
  size?: number
}

/** Decorative brand tile; the adjacent wordmark or heading supplies its label. */
export function BrandMark({ size = 44 }: BrandMarkProps) {
  const { theme } = useTokens()

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.tones.action.soft,
        borderColor: theme.tones.action.border,
        borderRadius: radii.md,
        borderWidth: 1,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      <Image
        source={mark}
        accessible={false}
        resizeMode="contain"
        style={{ width: size / 2, height: size / 2, tintColor: theme.tones.action.text }}
      />
    </View>
  )
}
