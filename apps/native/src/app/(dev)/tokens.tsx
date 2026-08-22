/**
 * Design-token sample screen (spike gate 4).
 *
 * Composes hand-rolled mini primitives from the lifted Sheetless tokens into a
 * plausible "Today" card so we can eyeball fidelity on Android and expo web.
 * Everything here is plain RN primitives — no template components.
 */
import { useState, type ReactNode } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import {
  fontFamily,
  fontSizes,
  radii,
  spacing,
  toneColor,
  useTokens,
  type Theme,
  type Tone,
  type ToneName,
} from '@/lib/tokens'

// ---------------------------------------------------------------------------
// Mini primitives (SpikeText / SpikeHeading / SpikeCaption / SpikePanel / …)
// ---------------------------------------------------------------------------

interface SpikeTextProps {
  children: ReactNode
  tone?: Tone
  size?: keyof typeof fontSizes
  weight?: TextStyle['fontWeight']
  style?: StyleProp<TextStyle>
  numberOfLines?: number
}

function SpikeText({ children, tone, size = 'md', weight, style, numberOfLines }: SpikeTextProps) {
  const { theme } = useTokens()
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color: toneColor(theme, tone) ?? theme.text,
          fontFamily,
          fontSize: fontSizes[size],
          fontWeight: weight ?? '400',
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

function SpikeHeading({ children }: { children: ReactNode }) {
  const { theme } = useTokens()
  return (
    <Text
      style={{
        color: theme.text,
        fontFamily,
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.2,
      }}
    >
      {children}
    </Text>
  )
}

/** Uppercase section label — web .vf-section-label (10px / 800 / 0.08em). */
function SpikeCaption({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const { theme } = useTokens()
  return (
    <Text
      style={{
        color: toneColor(theme, tone) ?? theme.textMuted,
        fontFamily,
        fontSize: fontSizes.caption,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  )
}

interface SpikePanelProps {
  children: ReactNode
  /** `panel` = elevated card; `inset` = recessed surface (mirrors web Panel). */
  surface?: 'panel' | 'inset'
  style?: StyleProp<ViewStyle>
}

function SpikePanel({ children, surface = 'panel', style }: SpikePanelProps) {
  const { theme } = useTokens()
  const inset = surface === 'inset'
  const shadow: ViewStyle =
    inset
      ? {}
      : Platform.OS === 'web'
        ? { boxShadow: theme.shadowCard }
        : Platform.OS === 'android'
          ? { elevation: theme.scheme === 'light' ? 3 : 0 }
          : {
              shadowColor: '#081114',
              shadowOpacity: theme.scheme === 'light' ? 0.1 : 0.45,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            }
  return (
    <View
      style={[
        {
          backgroundColor: inset ? theme.surface2 : theme.surface,
          borderColor: inset ? theme.border : theme.cardBorder,
          borderRadius: inset ? radii.md : radii.lg,
          borderWidth: 1,
        },
        shadow,
        style,
      ]}
    >
      {children}
    </View>
  )
}

/** Compact metric tile: right-aligned bold value over a dimmed uppercase label. */
function SpikeStatCard({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  const { theme } = useTokens()
  return (
    <SpikePanel surface="inset" style={{ flex: 1, minWidth: 0, padding: 12 }}>
      <Text
        numberOfLines={1}
        style={{
          color: toneColor(theme, tone) ?? theme.text,
          fontFamily,
          fontSize: fontSizes.stat,
          fontVariant: ['tabular-nums'],
          fontWeight: '900',
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
      <View style={{ marginTop: 4 }}>
        <SpikeCaption>{label}</SpikeCaption>
      </View>
    </SpikePanel>
  )
}

/** Uppercase soft-fill badge — web Badge variant="light" size="xs". */
function SpikeBadge({ children, tone }: { children: ReactNode; tone: ToneName }) {
  const { theme } = useTokens()
  const colors = theme.tones[tone]
  return (
    <View
      style={{
        backgroundColor: colors.soft,
        borderColor: colors.border,
        borderRadius: radii.sm,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontFamily,
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </View>
  )
}

/** Filled primary button — action tone, web Button (radius md, fw 800, 36px min). */
function SpikeButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const { theme } = useTokens()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.primaryFill,
        borderRadius: radii.md,
        justifyContent: 'center',
        minHeight: 36,
        opacity: pressed ? 0.85 : 1,
        paddingHorizontal: spacing.lg,
      })}
    >
      <Text
        style={{
          color: theme.primaryFillText,
          fontFamily,
          fontSize: fontSizes.md,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function SpikeInput({ placeholder }: { placeholder: string }) {
  const { theme } = useTokens()
  const [focused, setFocused] = useState(false)
  const [value, setValue] = useState('')
  return (
    <TextInput
      value={value}
      onChangeText={setValue}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        {
          backgroundColor: theme.inputBackground,
          borderColor: focused ? theme.focusOutline : theme.border,
          borderRadius: radii.md,
          borderWidth: 1,
          color: theme.text,
          fontFamily,
          fontSize: fontSizes.md,
          minHeight: 36,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        // Focus-ring halo only exists as box-shadow; native gets border swap only.
        Platform.OS === 'web' && focused
          ? ({ boxShadow: `0 0 0 2px ${theme.focusRing}`, outlineWidth: 0 } as TextStyle)
          : null,
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const BADGE_TONES: ToneName[] = ['action', 'accent', 'success', 'warning', 'danger', 'neutral']

export default function TokensScreen() {
  const { theme, isDark } = useTokens()
  return (
    <ScrollView
      style={{ backgroundColor: theme.background, flex: 1 }}
      contentContainerStyle={styles.content}
    >
      <View style={{ gap: 2 }}>
        <SpikeCaption>Friday · Aug 22</SpikeCaption>
        <SpikeHeading>Today</SpikeHeading>
      </View>

      <SpikePanel style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={styles.rowBetween}>
          <SpikeCaption>Next session</SpikeCaption>
          <SpikeBadge tone="action">Week 3 · Day 2</SpikeBadge>
        </View>

        <View style={{ gap: 2 }}>
          <SpikeText size="lg" weight="700">
            Competition Bench Press
          </SpikeText>
          <SpikeText tone="dimmed" size="sm">
            4 × 5 @ RPE 7 · top set 100 kg · rest 3 min
          </SpikeText>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <SpikeStatCard label="Top set" value="100 kg × 5" />
          <SpikeStatCard label="e1RM" value="120 kg" tone="action" />
        </View>

        <SpikeInput placeholder="Session notes — how did it feel?" />
        <SpikeButton label="Start session" />
      </SpikePanel>

      <SpikePanel surface="inset" style={{ gap: spacing.sm, padding: spacing.md }}>
        <SpikeCaption>Tone palette</SpikeCaption>
        <View style={styles.badgeRow}>
          {BADGE_TONES.map((tone) => (
            <SpikeBadge key={tone} tone={tone}>
              {tone}
            </SpikeBadge>
          ))}
        </View>
        <SpikeText tone="dimmed" size="xs">
          Rendering the {isDark ? 'dark' : 'light'} theme via useColorScheme().
        </SpikeText>
      </SpikePanel>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  content: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: 520,
    padding: spacing.md,
    paddingBottom: 48,
    width: '100%',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
