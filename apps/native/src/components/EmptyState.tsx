import { View } from 'react-native'
import { radii, spacing, useTokens } from '@/lib/tokens'
import { Heading } from './Heading'
import { Text } from './Text'

export interface EmptyStateProps {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}

/** Dashed inset placeholder — mirrors the web `EmptyState` molecule. */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  const { theme } = useTokens()
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.surface2,
        borderColor: theme.border,
        borderRadius: radii.lg,
        borderStyle: 'dashed',
        borderWidth: 1,
        gap: spacing.sm,
        justifyContent: 'center',
        minHeight: 220,
        padding: spacing.lg,
      }}
    >
      <Heading order={3}>{title}</Heading>
      <Text tone="dimmed" size="sm" align="center">
        {children}
      </Text>
      {action ? <View style={{ marginTop: spacing.xs }}>{action}</View> : null}
    </View>
  )
}
