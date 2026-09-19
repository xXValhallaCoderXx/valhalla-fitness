import { Button, Caption, Panel } from '@/components'
import { spacing } from '@/lib/tokens'

export function UnsentSetNotice({ count, disabled, onReview }: { count: number; disabled: boolean; onReview: () => void }) {
  if (!count) return null
  return <Panel style={{ padding: spacing.sm, gap: spacing.xs }}>
    <Caption tone="warning">{count} set{count === 1 ? ' has' : 's have'} unsaved edits. Save or reset your changes before finishing.</Caption>
    <Button label="Review unsaved set" variant="default" disabled={disabled} onPress={onReview} />
  </Panel>
}
