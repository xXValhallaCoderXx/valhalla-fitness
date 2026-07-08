import { InfoHint } from '~/components'

export function ProgramInfoHint({ label, children }: { label: string; children: string }) {
  return <InfoHint label={label}>{children}</InfoHint>
}
