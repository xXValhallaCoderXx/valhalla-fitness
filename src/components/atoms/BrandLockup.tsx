import { BrandMark } from './BrandMark'
import { Text } from './Text'

export type BrandLockupSize = 'xs' | 'sm' | 'md' | 'lg'

export function BrandLockup({ size = 'sm' }: { size?: BrandLockupSize }) {
  return (
    <div className="flex items-center gap-2">
      <BrandMark size={size} />
      <Text component="span" size="sm" fw={900} truncate>
        Sheetless
      </Text>
    </div>
  )
}
