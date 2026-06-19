import { Collapsible, Card } from '@/components/ui'
import { generateSessionPlan } from '@/engine/cycle'
import { CYCLE_WEEKS, SESSION_LABELS } from '@/engine/program-config'
import { LIFT_IDS, LIFT_LABELS, type LiftId } from '@/engine/types'
import { useStore } from '@/state/store'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TEMPLATE_LABELS = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  assist: 'Assist',
} as const

function setLine(lift: LiftId, tm: number | null, weekIndex: number, rounding: number): string {
  if (tm == null) return 'TM not set'
  const plan = generateSessionPlan(lift, tm, weekIndex, rounding)
  const main = plan.mainSets
    .map((set) => `${set.weight} x ${set.targetReps}${set.isAmrap ? '+' : ''}`)
    .join(', ')
  const fsl = plan.fslSets.length > 0 ? ` / FSL ${plan.fslSets.length} x ${plan.fslSets[0].targetReps} @ ${plan.fslSets[0].weight}` : ''
  return `${main}${fsl}`
}

export function Plan() {
  const state = useStore((s) => s.state)!
  const currentWeek = state.cyclePointer.weekIndex

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Plan</h1>
      <p className="mb-4 text-sm text-slate-400">
        The full comeback structure: cycle, week, schedule, and accessory slots.
      </p>

      <Card className="mb-4 border-indigo-500/50 bg-indigo-500/10">
        <p className="text-xs uppercase text-indigo-200">Current block</p>
        <h2 className="mt-1 text-lg font-semibold">
          Cycle {state.cyclePointer.cycleIndex + 1} / {CYCLE_WEEKS[currentWeek]?.label}
        </h2>
        <div className="mt-3 space-y-2 text-sm">
          {LIFT_IDS.map((lift) => (
            <div key={lift} className="rounded-lg bg-slate-950/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{LIFT_LABELS[lift]}</span>
                <span className="text-slate-400">TM {state.lifts[lift].trainingMax ?? '-'} kg</span>
              </div>
              <p className="mt-1 text-slate-300">{setLine(lift, state.lifts[lift].trainingMax, currentWeek, state.config.roundingKg)}</p>
            </div>
          ))}
        </div>
      </Card>

      <section className="mb-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase text-slate-400">4-week cycle</h2>
        {CYCLE_WEEKS.map((week, weekIndex) => (
          <Collapsible
            key={week.name}
            title={week.label}
            summary={week.fsl ? 'Main work plus FSL back-off' : 'Deload, no FSL'}
            defaultOpen={weekIndex === currentWeek}
          >
            <div className="space-y-3 text-sm">
              {LIFT_IDS.map((lift) => (
                <div key={lift}>
                  <p className="font-semibold">{LIFT_LABELS[lift]}</p>
                  <p className="text-slate-400">{setLine(lift, state.lifts[lift].trainingMax, weekIndex, state.config.roundingKg)}</p>
                </div>
              ))}
            </div>
          </Collapsible>
        ))}
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-400">Weekly rhythm</h2>
        <Card className="p-0">
          <div className="divide-y divide-slate-800">
            {DAYS.map((day, index) => {
              const session = state.config.schedule[String(index)] ?? 'rest'
              return (
                <div key={day} className="grid grid-cols-[3rem_1fr] gap-3 px-4 py-3 text-sm">
                  <span className="font-semibold text-slate-300">{day}</span>
                  <span className="text-slate-400">{SESSION_LABELS[session]}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-slate-400">Accessory slots</h2>
        {(['squat', 'bench', 'deadlift', 'assist'] as const).map((session) => (
          <Collapsible
            key={session}
            title={TEMPLATE_LABELS[session]}
            summary={`${state.sessionTemplates[session].accessorySlotIds.length} slots`}
          >
            <div className="space-y-2">
              {state.sessionTemplates[session].accessorySlotIds.map((slotId) => {
                const slot = state.accessorySlots[slotId]
                const exercise = state.exerciseLibrary[slot.plannedExerciseId]
                return (
                  <div key={slot.id} className="rounded-lg bg-slate-950 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{slot.title}</span>
                      <span className="text-slate-500">
                        {slot.sets} x {slot.repLow === slot.repHigh ? slot.repLow : `${slot.repLow}-${slot.repHigh}`}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-400">{exercise?.name ?? slot.plannedExerciseId}</p>
                  </div>
                )
              })}
            </div>
          </Collapsible>
        ))}
      </section>
    </div>
  )
}
