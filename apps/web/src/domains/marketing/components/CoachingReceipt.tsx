import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { progressionReceiptCopy } from '~/domains/marketing/lib/marketing-content'

const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const dashedRule = '1px dashed var(--mantine-color-default-border)'

/** The "Progression receipt" mock card. Rendered inside the How it works section. */
export function ReceiptCard() {
  return (
    <Panel p={0} className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: dashedRule }}>
        <Caption fw={800} tt="uppercase" style={{ fontFamily: mono }}>
          {progressionReceiptCopy.label}
        </Caption>
        <Caption fw={700} style={{ fontFamily: mono }}>
          {progressionReceiptCopy.context}
        </Caption>
      </div>

      <div className="grid gap-4 p-5">
        <div>
          <SectionLabel>{progressionReceiptCopy.youHitLabel}</SectionLabel>
          <Heading order={3} size="1.35rem" lh={1.1} mt={4}>
            {progressionReceiptCopy.youHitValue}
          </Heading>
          <Caption fw={600} mt={2}>
            {progressionReceiptCopy.youHitNote}
          </Caption>
        </div>

        <div className="pt-4" style={{ borderTop: dashedRule }}>
          <SectionLabel tone="action">{progressionReceiptCopy.nextLabel}</SectionLabel>
          <Heading order={3} size="1.85rem" lh={1.1} mt={4}>
            {progressionReceiptCopy.nextValue}
          </Heading>
        </div>

        <div className="pt-4" style={{ borderTop: dashedRule }}>
          <Caption component="p" fw={800} tt="uppercase">
            {progressionReceiptCopy.whyLabel}
          </Caption>
          <Text component="p" size="sm" tone="dimmed" fw={600} mt={4}>
            {progressionReceiptCopy.whyBody}
          </Text>
        </div>
      </div>
    </Panel>
  )
}
