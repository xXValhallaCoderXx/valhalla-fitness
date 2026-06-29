import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { coachingReceiptCopy } from '~/domains/marketing/lib/marketing-content'

const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const dashedRule = '1px dashed var(--mantine-color-default-border)'

export function CoachingReceipt() {
  return (
    <section className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto grid max-w-[1180px] items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1.1fr)] lg:gap-12">
        <div className="min-w-0">
          <SectionLabel>{coachingReceiptCopy.eyebrow}</SectionLabel>
          <Heading order={2} size="2rem" lh={1.1} mt="xs">
            {coachingReceiptCopy.heading}
          </Heading>
          <Text component="p" size="lg" tone="dimmed" fw={600} mt="sm" maw="32rem">
            {coachingReceiptCopy.subhead}
          </Text>
          <Caption fw={700} tone="action" mt="md">
            {coachingReceiptCopy.footnote}
          </Caption>
        </div>

        {/* Receipt card — pure receipt, distinct from the spreadsheet before/after card. */}
        <Panel p={0} className="overflow-hidden">
          <div
            className="flex items-center justify-between gap-3 px-5 py-3"
            style={{ borderBottom: dashedRule }}
          >
            <Caption fw={800} tt="uppercase" style={{ fontFamily: mono }}>
              Coaching receipt
            </Caption>
            <Caption fw={700} style={{ fontFamily: mono }}>
              {coachingReceiptCopy.context}
            </Caption>
          </div>

          <div className="grid gap-4 p-5">
            <div>
              <SectionLabel>{coachingReceiptCopy.youHitLabel}</SectionLabel>
              <Heading order={3} size="1.35rem" lh={1.1} mt={4}>
                {coachingReceiptCopy.youHitValue}
              </Heading>
              <Caption fw={600} mt={2}>
                {coachingReceiptCopy.youHitNote}
              </Caption>
            </div>

            <div className="pt-4" style={{ borderTop: dashedRule }}>
              <SectionLabel tone="action">{coachingReceiptCopy.nextLabel}</SectionLabel>
              <Heading order={3} size="1.85rem" lh={1.1} mt={4}>
                {coachingReceiptCopy.nextValue}
              </Heading>
            </div>

            <div className="pt-4" style={{ borderTop: dashedRule }}>
              <Caption component="p" fw={800} tt="uppercase">
                {coachingReceiptCopy.whyLabel}
              </Caption>
              <Text component="p" size="sm" tone="dimmed" fw={600} mt={4}>
                {coachingReceiptCopy.whyBody}
              </Text>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  )
}
