import type { CSSProperties } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { Text } from '~/components'
import type {
  GuidanceCheck,
  GuidanceIssue,
  GuidanceSeverity,
} from '~/domains/program/lib/custom-builder-guidance'

const GUIDANCE_SEVERITY_STYLE: Record<GuidanceSeverity, { style: CSSProperties; Icon: typeof AlertTriangle }> = {
  block: {
    style: { borderColor: 'var(--vf-danger-border)', backgroundColor: 'var(--vf-danger-soft)', color: 'var(--vf-danger-text)' },
    Icon: AlertTriangle,
  },
  warning: {
    style: { borderColor: 'var(--vf-warning-border)', backgroundColor: 'var(--vf-warning-soft)', color: 'var(--vf-warning-text)' },
    Icon: AlertTriangle,
  },
  info: {
    style: { borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)', color: 'var(--vf-action-text)' },
    Icon: Info,
  },
}

export const GUIDANCE_SEVERITY_ORDER: Record<GuidanceSeverity, number> = { block: 0, warning: 1, info: 2 }

export function issuesForChecks(issues: GuidanceIssue[], checks: GuidanceCheck[]) {
  return issues.filter((issue) => checks.includes(issue.check))
}

export function issuesForScope(issues: GuidanceIssue[], scope: 'global' | number) {
  return issues.filter((issue) => issue.scope === scope)
}

export function GuidanceList({ issues, className }: { issues: GuidanceIssue[]; className?: string }) {
  if (!issues.length) return null
  return (
    <div className={`grid gap-2${className ? ` ${className}` : ''}`}>
      {issues.map((issue) => {
        const { style, Icon } = GUIDANCE_SEVERITY_STYLE[issue.severity]
        return (
          <div key={issue.id} className="flex items-start gap-2.5 rounded-xl border p-3" style={style}>
            <Icon size={16} className="mt-0.5 shrink-0" />
            <Text size="sm" fw={600} c="inherit">
              {issue.message}
              {issue.fix ? (
                <Text component="span" display="block" size="sm" fw={400} c="inherit" mt={2} style={{ opacity: 0.85 }}>
                  {issue.fix}
                </Text>
              ) : null}
            </Text>
          </div>
        )
      })}
    </div>
  )
}
