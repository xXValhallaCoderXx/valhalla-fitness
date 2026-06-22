# Design Spec - Mobile Strength Tracker

## 1. Purpose

This document is a UI/UX brief for designing a mobile-first workout tracker for structured strength programs.

The product is not a generic habit tracker and not a social fitness app. It is a serious training tool for lifters who follow planned progression models and need help executing sessions accurately in the gym.

The design should make the user feel:

- Oriented: they know exactly what today is.
- Prepared: they can see what they did last time.
- Fast: logging a set takes a few seconds.
- Supported: progression hints are visible but never intrusive.
- In control: substitutions and recommendations are user-confirmed.

Primary source spec: `final-app-spec.md`.

Designer exports and Figma screens are references for direction and interaction patterns. When they conflict with `final-app-spec.md`, product facts and V1 scope in the app spec win.

Use the neutral product name "Mobile Strength Tracker" in this spec until branding is final. Designer placeholder names such as Designmate, Variantify, and Designflex should not appear in final handoff screens.

## 2. Product Personality

The app should feel calm, dense, and practical.

Use a visual language closer to a focused training cockpit than a lifestyle wellness app. Avoid large marketing heroes, motivational quotes, oversized empty cards, or decorative gradients. The gym context is noisy and time-pressured; the UI should be quiet and clear.

Mobile dark mode is the primary V1 visual direction because the reviewed mobile screens work well for gym use. Light mode remains required as a secondary theme and must meet the same accessibility and layout standards.

Design principles:

- Mobile-first.
- Today-first.
- Logging-first.
- Dense but not cramped.
- High contrast.
- Thumb-friendly controls.
- Minimal typing.
- No gamified clutter.
- No social feed patterns.

## 3. Target User Context

The user is in a gym, often between hard sets.

Assume:

- One-handed phone use.
- Sweaty hands.
- Poor lighting.
- Spotty connectivity.
- Short attention windows.
- Need to compare today's set to previous performance quickly.
- Need to log both main lifts and accessories.
- May need to substitute an exercise because equipment is taken.

The UI should not require reading long explanations during a workout.

## 4. Information Architecture

Use a bottom navigation with five primary destinations:

1. **Today**
2. **Program**
3. **History**
4. **Templates**
5. **Settings**

Today is the default landing screen after login.

### 4.1 Today

Purpose: show the next actionable workout and let the user start or resume it.

### 4.2 Program

Purpose: show the active program structure, current block/wave/week, upcoming sessions, and pending progression decisions.

### 4.3 History

Purpose: inspect movement history, best sets, recent logs, e1RM trends, accessory progression, and substitution history.

### 4.4 Templates

Purpose: browse and start supported programs.

V1 template groups:

- Healthy 5/3/1 FSL
- Bromley templates
  - Volume/Intensity
  - Powerbuilder
  - 70s Powerlifter
  - Bullmastiff
  - Pyramid
  - Minimalist
  - DUP
  - H/L/M
  - M/R/S
  - Strongman

### 4.5 Settings

Purpose: account, units, rounding, equipment profile, session preferences, and data/export settings.

## 5. Core User Flows

### 5.1 New User Flow

Screens:

1. Sign in / create account.
2. Choose units and rounding.
3. Choose starting program.
4. Enter anchor values or seed sets.
5. Confirm weekly schedule.
6. Land on Today.

UX notes:

- Keep onboarding short.
- Let users start with partial anchors when possible.
- Explain anchors with short labels, not lectures.
- Show a clear "you can edit this later" affordance.

### 5.2 Start Today's Workout

Flow:

1. User opens Today.
2. Sees session title, program position, and key lifts.
3. Taps Start Workout.
4. App opens Live Session.
5. User logs sets.
6. User finishes session.
7. App shows session summary and progression hints.

### 5.3 Resume Interrupted Workout

Flow:

1. User opens app.
2. Today shows active in-progress workout.
3. Primary action is Resume.
4. Live Session returns to last active movement and set.

Design requirement:

- Resume must be visually obvious. Do not bury an active session behind a generic Start button.

### 5.4 Substitute Movement

Flow:

1. User taps Swap on a movement.
2. App opens substitution sheet.
3. User sees recommended alternatives grouped by equipment/category.
4. User chooses an alternative and optional reason.
5. Live Session shows both planned and performed movement.

V1 is manual. The UI may prepare space for future LLM suggestions, but should not imply automatic AI coaching.

### 5.5 Finish Workout

Flow:

1. User taps Finish.
2. App checks for incomplete sets.
3. User confirms finish.
4. Summary shows:
   - Completed work.
   - Main lift top sets.
   - Accessory progression hints.
   - Pending anchor/TM recommendations.
5. User can accept, dismiss, or leave recommendations pending.

## 6. Screen Specifications

## 6.1 Auth Screens

### Sign In

Content:

- App name.
- Email field.
- Password or provider sign-in.
- Create account link.

Design notes:

- Keep simple.
- No marketing landing page.
- The app should open into the tool as soon as the user is authenticated.

## 6.2 Program Template Library

Purpose: let the user choose a starting program.

Layout:

- Header: "Choose a program"
- Filter chips:
  - All
  - 5/3/1
  - Bromley
  - Base
  - Peak
  - High volume
  - Low volume
- Template list.

Template row/card content:

- Program name.
- Canonical source badge, such as "Healthy 5/3/1" or "Bromley".
- Days per week.
- Primary progression style.
- Short description.
- Difficulty/complexity tag.
- Start button.

Example:

```text
Bullmastiff
Bromley | 4 days/week | Plus-set wave
Main lifts, variations, and bodybuilding work with autoregulated jumps.
```

Design notes:

- Use repeated cards or rows.
- Do not make this feel like an app store.
- Avoid decorative imagery. The user is choosing a tool, not shopping for inspiration.
- Template facts must be sourced from `final-app-spec.md`. Do not label Healthy 5/3/1 as Bromley, do not invent day counts, and do not reuse progression copy across unrelated templates.

## 6.3 Program Setup

Purpose: collect the minimum data needed to start a program.

Sections:

- Units and rounding.
- Schedule.
- Movement anchors.
- Optional equipment profile.
- Review.

Anchor input patterns:

- Training max direct entry.
- Recent set entry: weight, reps, RIR.
- Fixed 1RM entry.
- Manual anchor entry.

Anchor row content:

- Movement name.
- Anchor type.
- Input fields.
- Calculated value.
- Edit button.

Design notes:

- Use compact forms.
- Keep calculated values visually distinct from inputs.
- Make the confirm/start action sticky at bottom on mobile.

## 6.4 Today Screen

Purpose: orient the user and start/resume the next workout.

Mobile layout from top to bottom:

1. Date and active program.
2. Current block/wave/week.
3. Session title and hardness label.
4. Primary action: Start or Resume.
5. Main lift preview.
6. Accessory preview.
7. Pending progression decision, if any.
8. Upcoming session preview.

Example content:

```text
Today
Healthy 5/3/1 FSL - Cycle 2, Week 3

Deadlift + posterior chain
Hard | 75 min

Main
Deadlift: 142.5x5, 162.5x3, 180x1+
Last top set: 177.5x3 @ RIR 2

Accessories
RDL 3x8-10
Back extension 3x12-15
Cable crunch 3x10-15
```

Design notes:

- Today must be scannable in under 10 seconds.
- Main action should be visible above the fold.
- Use compact status chips for block/wave/week.
- Show previous top set near today's top set.
- Include compact context cards for this week, up next, and active program progress when space allows. On mobile, these are secondary to the start/resume action and current session card.
- Avoid explanatory prose.

## 6.5 Live Session Screen

Purpose: log a workout quickly and accurately.

Persistent elements:

- Session title.
- Progress indicator, such as 3 of 7 movements.
- Timer/rest control.
- Finish button.

Movement list behavior:

- Use a movement rail or compact movement list so the user can see completed, current, and upcoming work without losing the active set.
- Current movement expanded.
- Completed movements collapsed.
- Upcoming movements compact.
- User can jump between movements.

Expanded movement content:

- Movement name.
- Planned/performed movement indicator.
- Role badge: Main, Variation, Accessory, Event.
- Previous comparable performance.
- Prescription summary.
- Set rows.
- Notes.
- Swap button.
- History button.

Set row content:

- Set number.
- Target load/reps/RPE or rep range.
- Actual load input.
- Actual reps input.
- RIR/RPE selector.
- Done checkbox/button.

Design notes:

- Use large numeric controls.
- Support quick increments:
  - Load: -5, -2.5, +2.5, +5 kg.
  - Reps: -1, +1.
  - RIR: 0, 1, 2, 3, 4+.
- Include quick chips and steppers close to the active set row without hiding target values.
- Keep finish, plate math, swap, and history actions visible but visually secondary to logging.
- Keep the set row height stable after completion.
- Do not hide target values after logging actual values.
- Completed sets should be clearly marked but still readable.
- Mobile set rows must not collide with bottom navigation or safe-area chrome.

## 6.6 Main Lift Card

Main lift card must show:

- Movement name.
- Anchor type and value.
- Today's top set target.
- Previous comparable top set.
- e1RM or TM context.
- Plate math button.
- Progression hint.
- Set rows.
- Back-off rows, if generated.

Example:

```text
Deadlift
TM 190 kg

Top set today
180 kg x 1+
Last comparable: 177.5 kg x 3 @ RIR 2

Progression impact
Minimum keeps STANDARD alive. 3+ reps may qualify DOUBLE.
```

Design notes:

- The top set should be visually emphasized.
- Back-off rows should be attached to the movement but visually lighter.
- Progression hint should not feel like pressure to grind.

## 6.7 Accessory Card

Accessory card must show:

- Movement name.
- Role/category.
- Target sets and rep range.
- Previous performance.
- Today's load suggestion.
- Progression target.
- Set rows.
- Swap button.

Example:

```text
Chest-supported row
Upper back | Accessory

Target: 4x8-12 @ RIR 2
Last: 55 kg x 12, 12, 11, 10
Goal: reach 48 total reps before adding load
```

Design notes:

- Accessories should not look like throwaway notes.
- They can be visually smaller than main lifts, but still structured.
- The progression target should be short and specific.

## 6.8 Substitution Sheet

Purpose: replace an exercise while preserving planned history.

Layout:

- Sheet title: "Swap movement"
- Planned movement summary.
- Search field.
- Filter chips:
  - Same category
  - Same equipment
  - No equipment
  - Machines
  - Dumbbells
  - Cable
- Suggested alternatives.
- Reason selector.
- Confirm button.

Alternative row content:

- Movement name.
- Category.
- Equipment.
- Relationship, such as same pattern, easier setup, similar accessory.

After selection:

Live Session should show:

```text
Planned: Chest-supported row
Performed: Seated cable row
Reason: equipment missing
```

Design notes:

- Preserve trust by making the substitution explicit.
- Show a planned-vs-performed preview before confirmation, and state that both movements will be recorded.
- Do not pretend the movement is unchanged.
- V1 reason options are limited to equipment/crowding, preference, fatigue, and other. Do not include pain/injury as a reason until the future pain-gating module exists.
- Future AI suggestion area can be added later, but not in V1 unless implemented.

## 6.9 Finish Session Summary

Purpose: close the loop after training.

Sections:

- Session completion status.
- Main lift highlights.
- Accessory highlights.
- Progression recommendations.
- Notes.
- Done button.

Recommendation card content:

- Movement.
- Rule used.
- Input summary.
- Recommendation.
- Accept / Dismiss / Later actions.

Example:

```text
Deadlift
5/3/1 TM progression

All top sets hit at RIR >= 2.
Recommendation: TM 190 -> 195 kg.
```

Design notes:

- Recommendations must feel reviewable.
- Use "recommendation" language, not command language.
- Do not auto-accept changes.
- Every recommendation card must support Accept, Dismiss, and Later.

## 6.10 Program Screen

Purpose: show the structure and progress of the active program.

Sections:

- Program header.
- Current position.
- Timeline.
- Blocks and waves.
- Weekly schedule.
- Movement tracks.
- Pending decisions.

Timeline item content:

- Week number.
- Block/wave.
- Session count.
- Status: complete, current, upcoming, deload.

Design notes:

- This screen is for orientation, not live logging.
- Keep it compact and hierarchical.
- Let the user tap a week to preview sessions.

## 6.11 History Screen

Purpose: inspect training data.

Top-level tabs:

- Recent
- Movements
- PRs / Bests
- Volume

Movement history detail:

- Movement name.
- Category.
- Recent logs.
- Best sets.
- e1RM trend, if applicable.
- Volume trend.
- Accessory progression state.
- Substitutions involving this movement.

Design notes:

- History should support accessories as naturally as main lifts.
- Use charts sparingly and make them readable on mobile.
- Prefer useful recent comparisons over vanity dashboards.

## 6.12 Settings Screen

Settings sections:

- Account.
- Units and rounding.
- Equipment profile.
- Program preferences.
- Data and export.
- Future modules.

Equipment profile examples:

- Barbell.
- Rack.
- Bench.
- Dumbbells.
- Cables.
- Machines.
- Specialty bars.
- Strongman implements.

Design notes:

- Equipment profile supports future substitutions.
- Do not overcomplicate this in V1.

## 7. Component System

### 7.1 Navigation

- Bottom tab bar for primary areas.
- Sticky session header during live workout.
- Sticky bottom action for setup and finish flows.

### 7.2 Status Chips

Use chips for:

- Block.
- Wave.
- Week.
- Hardness.
- Role.
- Source.
- Progression status.
- Substitution reason.

Examples:

- `Hard`
- `Week 3`
- `Main`
- `Accessory`
- `Pending`
- `Bromley`

### 7.3 Movement Cards

Movement cards are acceptable for repeated workout items.

Rules:

- Do not nest cards inside cards.
- Keep radius modest.
- Keep spacing consistent.
- Main lift cards can have stronger emphasis.
- Accessory cards should remain structured and legible.

### 7.4 Set Rows

Set rows are the most important component.

Required states:

- Planned.
- Active.
- Completed.
- Missed target.
- Edited.
- Back-off.
- AMRAP/top set.

Set row should not change height dramatically between states.

### 7.5 Numeric Inputs

Use:

- Stepper buttons.
- Direct text input on tap.
- Quick increment chips.
- Recent value defaults.

Avoid:

- Tiny steppers.
- Sliders for exact weights.
- Controls that require fine motor precision.

### 7.6 RIR/RPE Selector

Use segmented controls or chips.

RIR options:

- 0
- 1
- 2
- 3
- 4+

RPE options:

- 6
- 7
- 8
- 9
- 10

Default for this app should be RIR where possible because the source plans often reason from reps in reserve.

### 7.7 Rest Timer

Timer requirements:

- Start automatically after completed set if enabled.
- Manual start/stop.
- Compact persistent display.
- Optional vibration/sound later.

### 7.8 Plate Math

Plate math should be available from main lift rows and load inputs.

Display:

- Target load.
- Bar weight.
- Plates per side.
- Unit.

Keep as a sheet or popover, not a full page.

## 8. Visual Direction

### 8.1 Overall Style

Use a restrained operational interface.

Good references:

- Training log.
- Finance/watchlist density.
- Field tool.
- Lightweight dashboard.

Primary mobile theme:

- Use a dark, high-contrast operational interface for V1 mobile screens.
- Use light mode as a complete secondary theme, not an afterthought.
- Desktop can lean light by default if dense review workflows remain readable.

Avoid:

- Lifestyle wellness aesthetic.
- Motivational poster design.
- Huge hero images.
- Decorative gradients.
- Dark, low-contrast moodiness.
- One-color palettes.

### 8.2 Color

Use a neutral base with functional accent colors.

Recommended color roles:

- Background.
- Surface.
- Surface elevated.
- Text primary.
- Text secondary.
- Border.
- Accent/action.
- Success.
- Warning.
- Danger.
- Info.

Do not let the whole app become a single blue/slate or purple gradient theme. The palette should be practical and varied enough that status has meaning.

### 8.3 Typography

Requirements:

- High readability on mobile.
- Strong numeric legibility.
- No negative letter spacing.
- Do not scale type with viewport width.
- Use large type only for key workout numbers and page titles.

Suggested hierarchy:

- Page title.
- Session title.
- Movement title.
- Set numbers and load values.
- Supporting labels.
- Metadata chips.

### 8.4 Icons

Use familiar icons for:

- Start/play.
- Pause.
- Complete/check.
- Swap.
- History.
- Timer.
- Plate math/calculator.
- Notes.
- Settings.
- Program/calendar.

Icons should support recognition, not decorate the UI.

## 9. Interaction Details

### 9.1 Logging Speed

The fastest path for a normal set:

1. Target values are prefilled.
2. User adjusts reps/load only if different.
3. User taps RIR.
4. User taps Done.

A repeated accessory set should take one or two taps if load is unchanged.

### 9.2 Defaults

- Actual load defaults to target load.
- Actual reps defaults to target reps for fixed sets.
- For rep-range accessories, actual reps may default to previous set's reps or blank.
- RIR defaults to blank, but the UI should make entering it easy.
- Back-off rows generated after a top set inherit computed values.

### 9.3 Error Prevention

Warn gently when:

- User logs a top set below minimum reps.
- User logs RIR 0 on a plan intended to stop short.
- User finishes with incomplete main lift sets.
- User substitutes a movement from a very different category.

Warnings should be dismissible and should not block logging unless data is impossible to save.

### 9.4 Offline/Sync States

Show small sync state indicators:

- Synced.
- Saving.
- Offline.
- Sync failed.

Do not interrupt workout logging for normal network problems.

## 10. Content Guidelines

Use short, direct labels.

Preferred:

- "Start workout"
- "Resume workout"
- "Swap movement"
- "Last time"
- "Top set"
- "Back-off"
- "Add load next time"
- "Repeat load"
- "Pending recommendation"

Avoid:

- Long coaching paragraphs during workouts.
- Aggressive motivational copy.
- Ambiguous labels like "optimize" or "enhance."
- AI-forward copy in V1.

## 11. Accessibility

Requirements:

- Strong contrast in both light and dark themes.
- Large touch targets.
- Screen-reader labels for icon buttons.
- Inputs usable without color alone.
- Completed and warning states must have icons/text, not just color.
- Numeric values must be readable at a glance.

## 12. Responsive Behavior

Primary design target is mobile portrait.

Also design:

- Mobile landscape enough to remain usable.
- Tablet layout with two columns where useful.
- Desktop layout for reviewing program/history more comfortably.

Desktop should not become a different product. It is the same app with more room.

Layout quality requirements:

- No text overflow, clipped labels, or overlapping navigation.
- Bottom navigation and sticky actions must leave safe bottom padding.
- Collapsed movement cards must remain readable at 375px width.
- Program timeline labels, template filters, and tab labels must not wrap into vertical text.

## 13. Designer Deliverables

Create designs for:

1. Sign in.
2. Template library.
3. Program setup with anchors.
4. Today screen with planned workout.
5. Today screen with workout in progress.
6. Live session, main lift expanded.
7. Live session, accessory expanded.
8. Live session with completed sets.
9. Substitution sheet.
10. Finish session summary.
11. Program timeline.
12. Movement history detail.
13. Settings.

Include:

- Mobile dark mode as the primary V1 theme.
- Mobile light mode as a secondary theme with the same accessibility standards.
- Component states for set rows.
- Start and resume states for Today.
- Main lift expanded, accessory expanded, completed, missed target, edited, back-off, and AMRAP/top-set states.
- Empty states.
- Loading states.
- Offline/sync states.
- Sync failure states.
- Final text/content pass against `final-app-spec.md`.

## 14. Acceptance Criteria For Design

The design is successful if:

- A user can identify today's workout in under 10 seconds.
- A user can start or resume a workout without searching.
- A main lift set can be logged in a few taps.
- An accessory set feels as structured as a main lift set.
- Previous performance is visible before logging.
- Substitutions are explicit and trust-preserving.
- Progression recommendations are visible but reviewable.
- The UI remains readable on a small phone.
- Text, navigation, controls, and sticky actions do not overlap at 375px mobile width or desktop review width.
- Template cards match canonical program metadata from `final-app-spec.md`.
- Recommendation cards include Accept, Dismiss, and Later.
- Excluded features are absent or clearly marked future/unavailable.
- The app feels like a serious training tool, not a lifestyle landing page.

## 15. Feedback On Reviewed Designer Exports

Keep these directions:

- Today screen structure: current workout, top-set history, accessory preview, progression alert, this-week/up-next context, and active program progress.
- Live Session structure: movement rail, active set row, quick load/reps adjustments, RIR chips, finish button, plate math, swap, and history actions.
- Substitution sheet: explicit planned-vs-performed preview and history-preserving copy.
- Session Summary: completed work, main lift highlights, accessory outcomes, and reviewable progression actions.
- Program, History, and Settings IA: timeline, anchors, movement trends, substitution visibility, equipment profile, and sync status.

Change before final handoff:

- Replace placeholder product names with neutral "Mobile Strength Tracker" naming until brand is final.
- Fix program facts: Healthy 5/3/1 is not Bromley; remove autoregulated-jump copy from Healthy 5/3/1; correct Bromley day counts and labels.
- Remove `Pain / injury` from V1 substitution reasons.
- Add or confirm `Later` wherever progression recommendations appear.
- Fix visible layout bugs: vertical desktop nav labels, desktop summary header collision, garbled mobile collapsed movement card, Program Week 4 wrapping, and bottom-nav/content overlap.

Save for later:

- Rich desktop-only layouts, CSV export UI, deeper charting, provider sign-in polish, and advanced equipment-driven substitution filters.

Do not add for V1:

- Pain/injury workflows, readiness automation, AI-forward coaching language, autonomous workout mutation, lifestyle/marketing presentation, or app-store-style template browsing.
