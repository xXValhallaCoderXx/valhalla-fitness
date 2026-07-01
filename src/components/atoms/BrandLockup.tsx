import { BrandMark } from './BrandMark'
import { Text } from './Text'

export type BrandLockupSize = 'xs' | 'sm' | 'md' | 'lg'

export function BrandLockup({ size = 'sm' }: { size?: BrandLockupSize }) {
  return (
    <div className="flex items-center gap-2">
      <BrandMark size={size} />
      <span className="flex items-baseline gap-1">
        <Text component="span" size="sm" fw={900} truncate>
          Sheetless
        </Text>
        <Text component="span" size="xs" fw={700} tone="dimmed">
          (beta)
        </Text>
      </span>
    </div>
  )
}
