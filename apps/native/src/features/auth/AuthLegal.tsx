import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Button, Text } from '@/components'
import { spacing } from '@/lib/tokens'

export function AuthLegal() {
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(false)
  const opening = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const open = async (path: '/terms' | '/privacy') => {
    if (!mounted.current || opening.current) return
    opening.current = true
    setError(null)
    try { await WebBrowser.openBrowserAsync(`https://www.sheetless.fitness${path}`) }
    catch { if (mounted.current) setError('Unable to open that page. Please try again.') }
    finally { opening.current = false }
  }
  return <View style={{ gap: spacing.xs }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      <Button label="Terms" variant="subtle" size="sm" accessibilityLabel="Open Terms in browser" onPress={() => void open('/terms')} />
      <Button label="Privacy Policy" variant="subtle" size="sm" accessibilityLabel="Open Privacy Policy in browser" onPress={() => void open('/privacy')} />
    </View>
    {error ? <Text tone="danger" size="sm">{error}</Text> : null}
  </View>
}
