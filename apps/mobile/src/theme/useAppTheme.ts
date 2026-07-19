import { semanticColors, radius, spacing, typography } from '@sheetless/tokens'
import { useColorScheme } from 'react-native'

export function useAppTheme() {
  const mode = useColorScheme() === 'light' ? 'light' : 'dark'
  return {
    mode,
    colors: semanticColors[mode],
    radius,
    spacing,
    typography,
  }
}
