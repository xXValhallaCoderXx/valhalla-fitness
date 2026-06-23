# Custom Workout Plan

## Current State

The programme start flow is now intentionally basic: users choose a template, review plan information, set units/rounding/anchors, and start. It does not currently add accessories during the workout session.

The app already supports swapping a non-main movement inside an active session and choosing whether that swap applies only to the current session or to the rest of the current phase slot. The in-session accessory add flow should follow that same mental model.

The customization schema and draft wizard code added earlier should be kept for reuse, but it should not drive the normal template start flow.

## Plan 1: Add Accessory During A Workout Session

### Summary

Add an `Add accessory` action to the active workout session UI. The user can pick an accessory movement, choose a simple prescription, and decide whether it applies only to today or to the rest of the current phase/block.

### Product Flow

- Add an `Add accessory` button near the movement list/session toolbar, not inside each movement card.
- Open an `AddAccessoryModal` with:
  - Movement search over non-competition movements.
  - Simple prescription presets: `2x10-15`, `3x8-12`, `3x10-15`, `4x8-12`.
  - Optional note.
  - Scope choice: `This session only` or `Rest of this phase`.
- After confirmation:
  - Insert the accessory into the active session immediately.
  - Select the new accessory card so the user can log it.
  - Show a success notification that names the scope.

### Data Model

- Reuse `exercise_logs` and `set_logs` for session-only additions.
- Extend `workout_sessions.prescription_snapshot` so added session-only accessories appear when `getSessionInternal` reconstructs the session.
- Extend `program_accessory_additions` before using it for this feature:
  - Make `source_slot_id` nullable.
  - Add `target_summary text`.
  - Add `sets jsonb not null default '[]'::jsonb`.
  - Add `note text`.
- Keep existing copy-from-template support for future builder work, but allow manually prescribed added accessories to persist without requiring a source template slot.

### Server API

- Add `listAccessoryMovementOptionsFn`.
  - Return non-competition movements from `movements`.
  - Include movement name, category, equipment, and default unit.
- Add `addSessionAccessoryFn`.
  - Input: `sessionId`, `movementId`, `preset`, `scope`, optional `note`, `clientMutationId`.
  - Validate that the session is `in_progress`.
  - Validate that the movement exists and is not a competition/main lift.
  - Generate a stable slot id such as `added-accessory-{n}-{movementId}`.
  - Build target sets from the preset using the current session units.
  - Insert an `exercise_logs` row and matching `set_logs` rows.
  - Patch `workout_sessions.prescription_snapshot.movements` with the new accessory movement.
  - If scope is phase/block, insert into `program_accessory_additions` with `effective_from_week_index = activeProgram.currentWeekIndex + 1`.
  - Return `getSessionInternal(sessionId)`.

### UI Integration

- Add `Add accessory` to `LiveSessionFrame` or the session-level header area.
- Add `AddAccessoryModal` next to `MovementSwapModal`.
- Optimistically update the active session only after the API returns, to avoid mismatches in generated slot ids and set ids.
- Invalidate:
  - `session/{sessionId}`
  - `today`
  - `activeProgram` and `programOverview` only when scope is phase/block.

### Edge Cases

- Completed sessions cannot be edited.
- Planned sessions must be started before accessories can be added.
- Duplicates are allowed for v1, because users may intentionally add multiple rows/presses/curls.
- Added accessories should be clearly marked with an `Added` badge.
- Future phase/block additions should not alter completed sessions.

### Tests

- Unit test preset-to-set generation.
- API-level test for adding a session-only accessory into `prescription_snapshot`, `exercise_logs`, and `set_logs`.
- API-level test for phase/block persistence into `program_accessory_additions`.
- Session rendering test that added accessories appear in movement order and can be logged.

## Plan 2: User-Created Custom Programme Builder

### Summary

Add a guided custom programme builder that lets users create constrained programmes from supported methodologies instead of fully free-form workouts. V1 should create a reusable programme template owned by the user, then allow the user to start it like any other programme.

### Product Flow

- Add `Create programme` entry point on the templates/programmes page.
- Use a guided builder with these steps:
  - Goal and methodology: choose `None (logger only)`, `5/3/1-style`, `Bromley base/peak`, or `Simple linear progression`.
  - Schedule: choose 3 or 4 days per week.
  - Movements: choose day titles, main lift slots, optional variations, set count, and rep targets where the methodology allows it.
  - Accessories: choose curated accessory movements, set count, rep targets, and optional accessory methodology.
  - Review and create.
- After creation:
  - Save a user-owned template.
  - Show it in the programme catalog with a `Custom` badge.
  - Let the normal start flow handle anchors and activation.

### Constraints For V1

- Do not allow arbitrary set/rep editing everywhere.
- Do not allow custom progression formulas.
- Do not allow main lift types outside the existing movement catalog.
- Allow accessories only through curated categories and movement choices.
- Generate a template definition using the existing `2026.06.dsl` format.

### Data Model

- Use the existing template tables:
  - `program_templates.origin = 'user_created'`
  - `program_templates.created_by = auth.uid()`
  - `program_templates.parent_template_id` nullable for cloned/customized versions.
  - `program_template_versions.definition` stores generated DSL.
- Add RLS policies for user-created templates:
  - Users can select their own custom templates.
  - Users can insert/update/archive only templates they own.
  - Public/system templates remain read-only.

### Builder Presets

- `5/3/1-style`
  - 4 days/week.
  - Main lift per day.
  - Training max anchors.
  - Options for FSL-style backoff and simple accessory slots.
- `Bromley base/peak`
  - 4 days/week.
  - Base and peak phases.
  - Variation slots by phase.
  - Bodybuilding accessories by category.
- `Simple linear progression`
  - 3 or 4 days/week.
  - Fixed sets/reps.
  - Recommend anchor increases when all target work is completed at or above target reps and RIR.
- `None (logger only)`
  - Default methodology.
  - No required anchors.
  - All loads are user-selected.
  - No automatic progression or auto-regulation decisions.

### Server API

- Add `createCustomProgramTemplateFn`.
  - Validate builder input.
  - Generate a `TemplateDefinition`.
  - Run `validateTemplateDefinition`.
  - Insert `program_templates` and `program_template_versions`.
  - Return the new `ProgramTemplateSummary`.
- Add `updateCustomProgramTemplateFn` later, after v1 creation is stable.

### UI Integration

- Keep `ProgramCustomizationDraftWizard` code available as a source for future builder screens, but do not expose its setup-time override flow from normal template start.
- Create a new route or modal for custom programme creation.
- Add info tooltips to every methodology card. The `None (logger only)` tooltip should say: `No automatic recommendations are created; workouts are logged for history only.`
- Use the same cards, badges, and anchor start flow as normal templates once a custom programme exists.

### Acceptance Criteria

- A user can create a constrained custom programme from a methodology preset.
- The created programme appears in the catalog as `Custom`.
- The user can start it with the same basic start modal used by built-in templates.
- Generated template definitions validate before saving.
- Built-in coach/system templates remain immutable.

### Suggested Build Order

1. Add in-session `Add accessory` with session-only scope.
2. Add phase/block persistence for added accessories.
3. Add custom template RLS and API creation.
4. Add the guided custom programme builder UI.
5. Add editing/versioning for custom programmes after creation is proven useful.
