import { addCalendarDays } from '@sheetless/domain/shared/calendar-date'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native'

import { newClientMutationId } from '@/lib/uuid-polyfill'

const GATES = [
  { href: '/icu' as const, title: 'Gate 1 — Hermes full ICU', detail: '25 timezone/calendar invariants from the production test suite, run on this device.' },
  { href: '/auth' as const, title: 'Gate 2 — Supabase native auth', detail: 'Email OTP sign-in, SecureStore-encrypted session, survives restart, refresh works.' },
  { href: '/tokens' as const, title: 'Gate 4 — Token design system', detail: 'Sheetless look built from real theme values; judge fidelity on Android vs web.' },
]

export default function GateHub() {
  const router = useRouter()
  const dark = useColorScheme() === 'dark'
  const [mutationId, setMutationId] = useState(() => newClientMutationId())
  const isHermes = Boolean((globalThis as { HermesInternal?: unknown }).HermesInternal)
  const workspaceProof = addCalendarDays('2026-08-22', 1)

  const colors = dark
    ? { bg: '#101418', card: '#1a2027', text: '#e8edf2', muted: '#9aa7b4', accent: '#3fb7d7', ok: '#4caf7d' }
    : { bg: '#f4f6f8', card: '#ffffff', text: '#1c2530', muted: '#5c6a78', accent: '#197f9a', ok: '#2e7d5b' }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Text style={[styles.heading, { color: colors.text }]}>Sheetless native spike</Text>
      <Text style={[styles.sub, { color: colors.muted }]}>
        Phase 0 de-risk gates. Each screen is its own written pass/fail evidence.
      </Text>

      {GATES.map((gate) => (
        <Pressable
          key={gate.href}
          onPress={() => router.push(gate.href)}
          style={[styles.card, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.cardTitle, { color: colors.accent }]}>{gate.title}</Text>
          <Text style={[styles.cardDetail, { color: colors.muted }]}>{gate.detail}</Text>
        </Pressable>
      ))}

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.accent }]}>Gate 3 — Metro + workspace + UUID (inline)</Text>
        <Row label="JS engine" value={isHermes ? 'Hermes' : 'JSC / web'} colors={colors} />
        <Row label="Platform" value={`${Platform.OS} ${Platform.Version ?? ''}`} colors={colors} />
        <Row
          label="@sheetless/domain import"
          value={workspaceProof === '2026-08-23' ? `ok → addCalendarDays = ${workspaceProof}` : `FAIL: ${String(workspaceProof)}`}
          colors={colors}
          ok={workspaceProof === '2026-08-23'}
        />
        <Row label="crypto.randomUUID()" value={mutationId} colors={colors} ok={/^[0-9a-f-]{36}$/.test(mutationId)} />
        <Pressable onPress={() => setMutationId(newClientMutationId())} style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={styles.buttonText}>New clientMutationId</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

function Row({ label, value, colors, ok }: { label: string; value: string; colors: { text: string; muted: string; ok: string }; ok?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: ok === undefined ? colors.text : ok ? colors.ok : '#d9534f' }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  heading: { fontSize: 24, fontWeight: '700' },
  sub: { fontSize: 14, marginBottom: 4 },
  card: { borderRadius: 12, padding: 16, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardDetail: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, flexShrink: 1 },
  button: { marginTop: 10, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '600' },
})
