import { runIcuChecks, type IcuCheckReport } from '@/lib/icu-checks'
import { useCallback, useEffect, useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

type EnvRow = { label: string; value: string }

function safeRead(read: () => unknown): string {
  try {
    const value = read()
    if (value === undefined) return 'undefined'
    if (value === null) return 'null'
    return String(value)
  } catch (error) {
    return `threw: ${error instanceof Error ? error.message : String(error)}`
  }
}

function readEnvironment(): EnvRow[] {
  const hermes = (globalThis as { HermesInternal?: unknown }).HermesInternal
  return [
    {
      label: 'Platform',
      value: safeRead(() => `${Platform.OS} ${Platform.Version ?? '(no version)'}`),
    },
    { label: 'JS engine', value: hermes ? 'Hermes' : 'JSC/other' },
    { label: 'typeof Intl', value: safeRead(() => typeof Intl) },
    {
      label: 'Resolved timeZone',
      value: safeRead(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    },
    {
      label: 'Resolved locale',
      value: safeRead(() => Intl.DateTimeFormat().resolvedOptions().locale),
    },
    {
      label: 'supportedValuesOf(timeZone)',
      value: safeRead(() => {
        const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
        if (typeof intl.supportedValuesOf !== 'function') return 'unavailable'
        return `${intl.supportedValuesOf('timeZone').length} zones`
      }),
    },
  ]
}

export default function IcuGateScreen() {
  const scheme = useColorScheme()
  const dark = scheme !== 'light'
  const c = dark ? darkColors : lightColors

  const [report, setReport] = useState<IcuCheckReport | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [env, setEnv] = useState<EnvRow[]>([])

  const run = useCallback(() => {
    setEnv(readEnvironment())
    try {
      setReport(runIcuChecks())
      setFatalError(null)
    } catch (error) {
      setReport(null)
      setFatalError(
        error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error),
      )
    }
  }, [])

  useEffect(() => {
    run()
  }, [run])

  const total = report?.results.length ?? 0
  const banner = fatalError
    ? { text: 'ICU GATE: FAIL (runIcuChecks threw)', pass: false }
    : report === null
      ? { text: 'ICU GATE: running…', pass: null }
      : report.allPass
        ? { text: `ICU GATE: PASS (${report.passed}/${total})`, pass: true }
        : { text: `ICU GATE: FAIL (${report.failed} failed)`, pass: false }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={[
            styles.banner,
            {
              backgroundColor:
                banner.pass === null ? c.panel : banner.pass ? c.passBg : c.failBg,
              borderColor: banner.pass === null ? c.border : banner.pass ? c.pass : c.fail,
            },
          ]}
        >
          <Text
            style={[
              styles.bannerText,
              { color: banner.pass === null ? c.text : banner.pass ? c.pass : c.fail },
            ]}
          >
            {banner.text}
          </Text>
        </View>

        <Pressable
          onPress={run}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: c.buttonBg, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.buttonText, { color: c.buttonText }]}>Re-run checks</Text>
        </Pressable>

        <View style={[styles.panel, { backgroundColor: c.panel, borderColor: c.border }]}>
          <Text style={[styles.panelTitle, { color: c.muted }]}>ENVIRONMENT</Text>
          {env.map((row) => (
            <View key={row.label} style={styles.envRow}>
              <Text style={[styles.envLabel, { color: c.muted }]}>{row.label}</Text>
              <Text style={[styles.envValue, { color: c.text }]} selectable>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {fatalError !== null ? (
          <View style={[styles.panel, { backgroundColor: c.failBg, borderColor: c.fail }]}>
            <Text style={[styles.panelTitle, { color: c.fail }]}>runIcuChecks() THREW</Text>
            <Text style={[styles.mono, { color: c.fail }]} selectable>
              {fatalError}
            </Text>
          </View>
        ) : null}

        {report !== null ? (
          <View style={[styles.panel, { backgroundColor: c.panel, borderColor: c.border }]}>
            <Text style={[styles.panelTitle, { color: c.muted }]}>
              CHECKS ({report.passed} passed, {report.failed} failed)
            </Text>
            {report.results.map((result, index) => (
              <View
                key={`${index}-${result.name}`}
                style={[styles.checkRow, { borderTopColor: c.border }]}
              >
                <View style={styles.checkHeader}>
                  <Text
                    style={[styles.checkIcon, { color: result.pass ? c.pass : c.fail }]}
                  >
                    {result.pass ? '✓' : '✗'}
                  </Text>
                  <Text style={[styles.checkName, { color: c.text }]}>{result.name}</Text>
                </View>
                {!result.pass ? (
                  <View style={[styles.diffBox, { backgroundColor: c.diffBg }]}>
                    <Text style={[styles.mono, { color: c.pass }]} selectable>
                      expected: {result.expected}
                    </Text>
                    <Text style={[styles.mono, { color: c.fail }]} selectable>
                      actual:   {result.actual}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const darkColors = {
  bg: '#0d1117',
  panel: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  pass: '#3fb950',
  passBg: '#12261a',
  fail: '#f85149',
  failBg: '#2d1215',
  diffBg: '#0d1117',
  buttonBg: '#1f6feb',
  buttonText: '#ffffff',
}

const lightColors: typeof darkColors = {
  bg: '#ffffff',
  panel: '#f6f8fa',
  border: '#d0d7de',
  text: '#1f2328',
  muted: '#57606a',
  pass: '#1a7f37',
  passBg: '#dafbe1',
  fail: '#cf222e',
  failBg: '#ffebe9',
  diffBg: '#ffffff',
  buttonBg: '#0969da',
  buttonText: '#ffffff',
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    gap: 12,
    paddingBottom: 48,
  },
  banner: {
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  panel: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  envRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 3,
  },
  envLabel: {
    fontSize: 13,
    flexShrink: 0,
  },
  envValue: {
    fontSize: 13,
    fontFamily: MONO,
    flexShrink: 1,
    textAlign: 'right',
  },
  checkRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 7,
    gap: 6,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkIcon: {
    fontSize: 15,
    fontWeight: '800',
    width: 18,
    textAlign: 'center',
  },
  checkName: {
    fontSize: 14,
    flexShrink: 1,
  },
  diffBox: {
    marginLeft: 26,
    borderRadius: 6,
    padding: 8,
    gap: 2,
  },
  mono: {
    fontFamily: MONO,
    fontSize: 12.5,
    lineHeight: 18,
  },
})
