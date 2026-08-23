export * from '@sheetless/domain/session/live-session-utils'

// Overview-only set table: SET · TARGET · KG · REPS · RIR · ✓ (Target is shown on mobile too,
// freed up by the narrow RIR chip). Desktop KG/Reps columns are wider to host the inline ±
// steppers on the selected row. Focus mode uses its own FocusSetCard layout.
export const SET_GRID_CLASS =
  'grid grid-cols-[1.375rem_minmax(0,1fr)_3.25rem_2.75rem_3rem_1.75rem] md:grid-cols-[2.25rem_minmax(0,1fr)_8rem_7.5rem_5.5rem_2.75rem]'

/**
 * Select the whole value when a logger number input gains focus, so the first keystroke replaces
 * the seeded value instead of appending to it ("0" + "5" → "05"). Mobile Safari undoes a select()
 * made during the focus event, so re-select on the next frame — but only while the value is
 * untouched, otherwise a fast first keystroke would get selected and eaten by the second.
 */
export function selectAllOnFocus(event: { currentTarget: HTMLInputElement }) {
  const input = event.currentTarget
  const initialValue = input.value
  input.select()
  requestAnimationFrame(() => {
    if (document.activeElement === input && input.value === initialValue) input.select()
  })
}
