import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/state/store'
import { Button, Card, Field, NumberInput, Stepper } from '@/components/ui'
import type { LiftId } from '@/engine/types'
import { LIFT_IDS, LIFT_LABELS } from '@/engine/types'
import { trainingMax } from '@/engine/math'
import { DEFAULT_TM_PCT } from '@/engine/program-config'

interface Row {
  weight: number
  reps: number
  rir: number
}

const DEFAULTS: Record<LiftId, Row> = {
  squat: { weight: 150, reps: 5, rir: 2 },
  bench: { weight: 100, reps: 5, rir: 3 },
  deadlift: { weight: 210, reps: 1, rir: 1 },
}

export function Onboarding() {
  const navigate = useNavigate()
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const [rows, setRows] = useState<Record<LiftId, Row>>(DEFAULTS)

  function setRow(lift: LiftId, patch: Partial<Row>) {
    setRows((r) => ({ ...r, [lift]: { ...r[lift], ...patch } }))
  }

  const valid = LIFT_IDS.every((l) => rows[l].weight > 0 && rows[l].reps > 0)

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold">Set up your lifts</h1>
      <p className="mt-1 text-sm text-slate-400">
        Enter a recent top set for each lift — weight, reps, and how many reps you had left (RIR).
        We’ll seed your Training Maxes from these. Deadlift is pre-filled from your 210 kg single.
      </p>

      <div className="mt-6 space-y-4">
        {LIFT_IDS.map((lift) => {
          const r = rows[lift]
          const tm = r.weight > 0 ? trainingMax(r.weight, r.reps, r.rir, DEFAULT_TM_PCT[lift]) : 0
          return (
            <Card key={lift}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{LIFT_LABELS[lift]}</h2>
                <span className="text-sm text-slate-400">
                  TM → <span className="font-bold text-indigo-400">{tm || '—'} kg</span>
                </span>
              </div>
              <div className="space-y-3">
                <Field label="Weight (kg)">
                  <NumberInput value={r.weight} onChange={(v) => setRow(lift, { weight: v })} suffix="kg" />
                </Field>
                <div className="flex gap-6">
                  <div>
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Reps
                    </span>
                    <Stepper value={r.reps} min={1} max={15} onChange={(v) => setRow(lift, { reps: v })} />
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                      RIR
                    </span>
                    <Stepper value={r.rir} min={0} max={6} onChange={(v) => setRow(lift, { rir: v })} />
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Button
        className="mt-6 w-full"
        disabled={!valid}
        onClick={() => {
          completeOnboarding(rows)
          navigate('/', { replace: true })
        }}
      >
        Start training
      </Button>
    </div>
  )
}
