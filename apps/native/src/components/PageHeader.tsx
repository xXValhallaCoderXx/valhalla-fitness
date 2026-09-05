import { View } from 'react-native'
import { spacing, useTokens } from '@/lib/tokens'
import { Heading } from './Heading'
import { SectionLabel } from './SectionLabel'
import { Text } from './Text'

export interface PageHeaderProps {
  title: string
  /** Uppercase context line above the title (program · week, etc.). */
  eyebrow?: string
  /** Dimmed body line under the title. */
  subtitle?: string
  /** Right-aligned actions (badges, buttons). */
  actions?: React.ReactNode
}

/** Page heading block — a lite mirror of the web `PageHeader` molecule. */
export function PageHeader({ title, eyebrow, subtitle, actions }: PageHeaderProps) {
  const { theme } = useTokens()
  return (
    <View
      style={{
        borderBottomColor: theme.border,
        borderBottomWidth: 1,
        gap: 2,
        paddingBottom: spacing.sm,
      }}
    >
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1, gap: 2 }}>
          {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
          <Heading order={1}>{title}</Heading>
        </View>
        {actions}
      </View>
      {subtitle ? (
        <Text tone="dimmed" size="sm">
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}
