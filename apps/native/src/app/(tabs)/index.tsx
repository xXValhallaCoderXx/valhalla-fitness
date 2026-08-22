import { Link } from 'expo-router'
import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import { useSession } from '@/lib/session-provider'

export default function TodayScreen() {
  const { user } = useSession()
  const dark = useColorScheme() !== 'light'
  const colors = dark
    ? { bg: '#081114', text: '#e8edf2', muted: '#9aa7b4', accent: '#3fb7d7' }
    : { bg: '#f4f6f8', text: '#1c2530', muted: '#5c6a78', accent: '#197f9a' }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Today</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Signed in as {user?.email ?? 'unknown'}. Your planned session lands here next.
      </Text>
      <Link href="/(dev)/tokens" style={[styles.link, { color: colors.accent }]}>
        Dev · token styleguide
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  heading: { fontSize: 26, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  link: { fontSize: 14, fontWeight: '600', marginTop: 8 },
})
