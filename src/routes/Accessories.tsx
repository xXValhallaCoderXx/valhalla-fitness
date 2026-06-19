import { useState } from 'react'
import { Button, Collapsible, Field, Glyph, NumberInput, Segmented, Select, TextArea } from '@/components/ui'
import { useStore } from '@/state/store'
import type { ExerciseCategory, FatigueCost } from '@/engine/program-config'

const LIFT_SESSIONS = ['squat', 'bench', 'deadlift', 'assist'] as const
const CATEGORIES: ExerciseCategory[] = [
  'quad',
  'hamstring',
  'hinge',
  'row',
  'vertical-pull',
  'press',
  'triceps',
  'biceps',
  'core',
  'prehab',
]
const FATIGUE: FatigueCost[] = ['low', 'moderate', 'high']

export function Accessories() {
  const state = useStore((s) => s.state)!
  const updateSlot = useStore((s) => s.updateAccessorySlot)
  const addCustomExercise = useStore((s) => s.addCustomExercise)
  const [session, setSession] = useState<(typeof LIFT_SESSIONS)[number]>('squat')
  const [customSlot, setCustomSlot] = useState('')
  const [customName, setCustomName] = useState('')
  const [customEquipment, setCustomEquipment] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>('quad')
  const [customFatigue, setCustomFatigue] = useState<FatigueCost>('low')
  const [showAdd, setShowAdd] = useState(false)

  const template = state.sessionTemplates[session]
  const slots = template.accessorySlotIds.map((slotId) => state.accessorySlots[slotId]).filter(Boolean)

  function createCustom() {
    if (!customName.trim() || !customSlot) return
    const id = `custom-${customName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
    addCustomExercise(
      {
        id,
        name: customName.trim(),
        category: customCategory,
        targetMuscles: [customCategory],
        equipment: customEquipment.trim() || 'custom',
        fatigueCost: customFatigue,
        note: customNote.trim() || undefined,
        custom: true,
      },
      customSlot,
    )
    setCustomName('')
    setCustomEquipment('')
    setCustomNote('')
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold">Accessory Builder</h1>
          <p className="text-sm text-slate-400">Manage swap pools without breaking the program shape.</p>
        </div>
        <Button className="flex shrink-0 items-center gap-2 px-3 py-2" onClick={() => setShowAdd((value) => !value)}>
          <Glyph name="plus" className="h-4 w-4" />
          Add
        </Button>
      </div>

      {showAdd && (
        <Collapsible title="New custom movement" summary="Attach it to a slot's swap pool" defaultOpen className="mb-4">
          <div className="space-y-3">
            <Field label="Attach to slot">
              <Select
                value={customSlot}
                onChange={(e) => {
                  const slotId = e.target.value
                  const slot = state.accessorySlots[slotId]
                  setCustomSlot(slotId)
                  if (slot) setCustomCategory(slot.category)
                }}
              >
                <option value="">Choose a slot</option>
                {Object.values(state.accessorySlots).map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.sessionType}: {slot.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-indigo-500"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Select value={customCategory} onChange={(e) => setCustomCategory(e.target.value as ExerciseCategory)}>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fatigue">
                <Select value={customFatigue} onChange={(e) => setCustomFatigue(e.target.value as FatigueCost)}>
                  {FATIGUE.map((fatigue) => (
                    <option key={fatigue} value={fatigue}>
                      {fatigue}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Equipment">
              <input
                value={customEquipment}
                onChange={(e) => setCustomEquipment(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-indigo-500"
              />
            </Field>
            <Field label="Note">
              <TextArea rows={2} value={customNote} onChange={(e) => setCustomNote(e.target.value)} />
            </Field>
            <Button
              className="w-full"
              onClick={() => {
                createCustom()
                if (customName.trim() && customSlot) setShowAdd(false)
              }}
              disabled={!customName.trim() || !customSlot}
            >
              Add to swap pool
            </Button>
          </div>
        </Collapsible>
      )}

      <Segmented
        value={session}
        onChange={setSession}
        options={LIFT_SESSIONS.map((value) => ({ value, label: value === 'assist' ? 'Assist' : value[0].toUpperCase() + value.slice(1) }))}
      />

      <div className="mt-4 space-y-3">
        {slots.map((slot, index) => {
          const selected = state.exerciseLibrary[slot.plannedExerciseId]
          const pool = slot.swapPool.map((id) => state.exerciseLibrary[id]).filter(Boolean)
          return (
            <Collapsible
              key={slot.id}
              title={
                <span className="flex items-center gap-2">
                  {slot.title}
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-normal text-slate-400">{slot.category}</span>
                </span>
              }
              summary={`${selected?.name ?? slot.plannedExerciseId} / ${slot.sets} x ${
                slot.repLow === slot.repHigh ? slot.repLow : `${slot.repLow}-${slot.repHigh}`
              } / ${pool.length} swaps`}
              defaultOpen={index === 0}
            >
              <Field label="Default movement">
                <Select value={slot.plannedExerciseId} onChange={(e) => updateSlot(slot.id, { plannedExerciseId: e.target.value })}>
                  {pool.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Sets">
                  <NumberInput value={slot.sets} step={1} min={1} onChange={(sets) => updateSlot(slot.id, { sets })} />
                </Field>
                <Field label="Rest sec">
                  <NumberInput value={slot.restSeconds} step={15} min={0} onChange={(restSeconds) => updateSlot(slot.id, { restSeconds })} />
                </Field>
                <Field label="Rep low">
                  <NumberInput value={slot.repLow} step={1} min={1} onChange={(repLow) => updateSlot(slot.id, { repLow })} />
                </Field>
                <Field label="Rep high">
                  <NumberInput value={slot.repHigh} step={1} min={1} onChange={(repHigh) => updateSlot(slot.id, { repHigh })} />
                </Field>
              </div>

              <div className="mt-3">
                <p className="mb-2 text-xs uppercase text-slate-500">Swap pool</p>
                <div className="flex flex-wrap gap-2">
                  {pool.map((exercise) => (
                    <span key={exercise.id} className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
                      {exercise.name}
                    </span>
                  ))}
                </div>
              </div>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
