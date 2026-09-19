import type { TextStyle } from 'react-native'
import regular from '../../assets/fonts/Figtree-Regular.ttf'
import medium from '../../assets/fonts/Figtree-Medium.ttf'
import semibold from '../../assets/fonts/Figtree-SemiBold.ttf'
import bold from '../../assets/fonts/Figtree-Bold.ttf'
import extrabold from '../../assets/fonts/Figtree-ExtraBold.ttf'
import black from '../../assets/fonts/Figtree-Black.ttf'

export const nativeFonts = {
  'Figtree-Regular': regular,
  'Figtree-Medium': medium,
  'Figtree-SemiBold': semibold,
  'Figtree-Bold': bold,
  'Figtree-ExtraBold': extrabold,
  'Figtree-Black': black,
}

/** Separate named faces avoid Android synthesising weights from the regular face. */
export function fontStyle(weight: TextStyle['fontWeight'] = '400'): TextStyle {
  const numeric = weight === 'bold' ? 700 : Number(weight) || 400
  const face = numeric >= 900 ? 'Black' : numeric >= 800 ? 'ExtraBold'
    : numeric >= 700 ? 'Bold' : numeric >= 600 ? 'SemiBold' : numeric >= 500 ? 'Medium' : 'Regular'
  return { fontFamily: `Figtree-${face}`, fontWeight: 'normal' }
}
