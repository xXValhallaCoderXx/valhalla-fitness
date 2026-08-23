import { View } from 'react-native'
import { Caption, Heading } from '@/components'
import { spacing } from '@/lib/tokens'

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ gap: 2 }}>
        <Heading order={2}>{title}</Heading>
        <Caption>{description}</Caption>
      </View>
      {children}
    </View>
  )
}
