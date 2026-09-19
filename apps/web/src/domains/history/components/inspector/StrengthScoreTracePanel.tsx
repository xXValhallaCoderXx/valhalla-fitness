import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { StrengthScoreTrace } from '~/domains/history/lib/strength-score-trace'
import { LoadTracePanel } from '~/domains/program/components/inspector/LoadTracePanel'
import { Caption, SectionLabel, Text } from '~/components'

/** Past this, the score is standing on a reading old enough to be worth replacing. */
const STALE_BODYWEIGHT_DAYS = 30

/**
 * How the strength score was worked out.
 *
 * The derivation itself is `LoadTracePanel`, unchanged — it is the same question every other trace
 * answers. What rides in its footer is the part only this figure has: which rung of the fallback is
 * carrying the number, and the polynomial it came out of.
 */
export function StrengthScoreTracePanel({
  trace,
  showFormulas,
}: {
  trace: StrengthScoreTrace
  showFormulas: boolean
}) {
  return (
    <LoadTracePanel
      trace={trace.trace}
      showFormulas={showFormulas}
      footer={
        <>
          <div>
            <SectionLabel className="mb-2">Fallback chain</SectionLabel>
            <div className="flex flex-wrap items-baseline gap-1.5">
              {trace.fallback.steps.map((step, index) => (
                <span key={step.kind} className="inline-flex items-baseline gap-1.5">
                  {index ? <Caption component="span">→</Caption> : null}
                  <Text
                    component="span"
                    size="xs"
                    fw={step.active ? 800 : 600}
                    tone={step.active ? 'action' : 'dimmed'}
                  >
                    {step.label}
                  </Text>
                </span>
              ))}
            </div>
            <Caption component="p" mt={4} lh={1.5}>{trace.fallback.requirement}</Caption>
          </div>

          {trace.coefficients ? (
            <div>
              <SectionLabel className="mb-2">Coefficients · {trace.coefficients.sex}</SectionLabel>
              <Text component="p" size="xs" className="font-mono" tone="dimmed" lh={1.6}>
                {trace.coefficients.terms.map((term) => `${term.symbol} ${term.value}`).join(' · ')}
                {` · bw clamp ${trace.coefficients.clamp[0]}–${trace.coefficients.clamp[1]}`}
              </Text>
            </div>
          ) : null}

          {trace.bodyweightAgeDays !== null && trace.bodyweightAgeDays > STALE_BODYWEIGHT_DAYS ? (
            <Link to="/settings" className="inline-flex items-center gap-1.5">
              <Text component="span" size="xs" fw={700} tone="action">
                Bodyweight is {trace.bodyweightAgeDays} days old — log a new one
              </Text>
              <ArrowRight size={12} color="var(--vf-action-text)" />
            </Link>
          ) : null}
        </>
      }
    />
  )
}
