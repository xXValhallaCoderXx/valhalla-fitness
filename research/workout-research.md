# Workout Research

## Purpose

This document is a handoff for researching public, popular strength programmes and deciding how they can fit the Sheetless workout DSL. It is not an implementation spec for adding templates yet. The next agent should research sources, classify IP risk, map each candidate into the existing DSL, and only then propose template additions.

## Source And IP Policy

- Do not add coach-branded templates or expand coach-derived coverage unless licensing is explicitly cleared.
- Treat Sheetless built-ins as original neutral templates. Use public programmes only as research inputs for generic primitives such as training-max waves, plus sets, volume/intensity waves, and linear progression.
- Public articles, official programme pages, and author-owned public posts can be used as research sources, but a public web summary is not a license grant.
- Do not copy long proprietary tables from books, paid spreadsheets, apps, private forums, or subscriber-only content.
- Cite every source URL used for a programme. Prefer official or author-owned sources over third-party summaries.
- If a programme is tied to a book or paid product, only use public information that the rightsholder has made available and mark the remaining details as unknown.

## Current DSL Primer

The workout engine is driven by validated `TemplateDefinition` JSON. The database stores pinned definitions in `program_template_versions.definition`; local fallback definitions live in code for seed/runtime fallback. Runtime expansion should use the pinned template definition rather than branching by template id.

Core shape:

- `schemaVersion`: currently `2026.06.dsl`.
- `id`, `name`, `timelineDescription`: template identity and display copy.
- `anchorType`: usually `training_max`, with `manual` used for logger-only templates.
- `durationWeeks`: number of weeks in the repeating cycle.
- `daysPerWeek`: number of sessions in each week. It must match `sessions.length`.
- `requiredAnchors`: movement ids needed to calculate percentage loads.
- `sessions`: ordered training days. Each session contains slots.
- `weeks`: ordered weekly prescriptions. Each week contains prescriptions keyed by slot `prescriptionId`.
- `progressionRules`: optional labels for the rule ids used by prescriptions.

Session slots:

- `id`: stable slot id within the session.
- `role`: `main`, `variation`, `accessory`, `warmup`, or `event`.
- `movementId`: either a movement id string or a phase-based object with `default` and optional `byPhase`.
- `anchorMovementId`: movement anchor used for percentage loading. Required when a slot uses percent loads for another movement.
- `prescriptionId`: key into each week's `prescriptions`.
- `targetSummary`: optional slot-level display override.

Prescription sets:

- `targetLoad.kind = "percent"` calculates from an anchor training max.
- `targetLoad.kind = "fixed"` uses fixed kg/lb values.
- `targetLoad.kind = "user_selected"` leaves load blank for the lifter.
- Sets can use `targetReps`, `targetRepMin`, `targetRepMax`, `targetRir`, `targetRpe`, `isTopSet`, `isAmrap`, `isBackoff`, and `label`.
- `progressionRuleId` is optional per prescription. Existing examples include `training_max_band`, `plus_set_wave`, `simple_linear_completion`, and `accessory_double_progression`.

Validation requirements:

- `sessions.length === daysPerWeek`.
- `weeks.length === durationWeeks`.
- Every session slot must have a matching prescription in every week.
- Any slot using percent loads must have its anchor listed in `requiredAnchors`.

## Research Targets

Research these first because they are common, linear, and likely map cleanly into the DSL:

- Madcow 5x5
- Starting Strength novice linear progression
- Generic/public 5x5
- Basic 5/3/1
- Public 5/3/1 variants, especially Boring But Big

After the required targets, rank source-safe additions such as:

- Texas Method
- Greyskull LP
- GZCLP
- Candito Linear
- Other widely used beginner or intermediate strength templates with public source material

Do not implement every candidate. The research output should recommend the smallest high-confidence set that fits the current DSL and product.

## Seed Source Links

Use these as starting points, then verify and add better sources if available:

- Starting Strength programme page: https://startingstrength.com/get-started/programs
- StrongLifts 5x5 guide: https://stronglifts.com/stronglifts-5x5/workout-program/
- StrongLifts Madcow 5x5 page: https://stronglifts.com/madcow-5x5/
- Wendler Boring But Big article: https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big

## Programme Research Worksheet

Create one worksheet section per programme. Use this exact structure so later implementation can compare candidates consistently.

### Programme Name

- Source links:
- Source confidence: high / medium / low
- IP risk: low / medium / high / unknown
- Recommended action: implement now / research more / keep private / skip
- Audience: novice / beginner / intermediate / advanced
- Schedule:
- Cycle length:
- Required anchors:
- Main lifts:
- Variations or assistance:
- Progression model:
- Deload or reset model:
- DSL fit: exact / small extension needed / not suitable
- DSL mapping notes:
- Missing DSL capability, if any:
- Open questions:

## Initial Fit Notes

These notes are not final research conclusions. They are starting hypotheses for the next agent to verify from cited sources.

### Starting Strength Novice LP

- Likely fit: small extension needed.
- Uses a 3-day, non-consecutive schedule with alternating A/B workouts and phased exercise substitutions.
- Main work is mostly fixed sets and reps with user-selected load, plus linear load increases after successful sessions.
- The current DSL can express the session structure and sets, but automatic progression may need a rule more specific than the existing `simple_linear_completion` if per-lift jumps, phase changes, and missed-lift resets are required.
- Treat book-specific details as source-sensitive unless available on official public pages.

### Generic 5x5 / StrongLifts-Style 5x5

- Likely fit: exact or small extension needed.
- Usually maps to a 3-day schedule alternating A/B sessions, with straight sets and simple load increases.
- The DSL can express 5x5 straight sets, 1x5 deadlift work, and user-selected or fixed starting loads.
- Confirm whether the product should use a generic public 5x5 label or a branded StrongLifts label. Use the branded name only if source and trademark risk are acceptable.

### Madcow 5x5

- Likely fit: small extension needed.
- Usually maps to a 3-day week with heavy, light, and medium workouts and weekly progression.
- The DSL can express ramped percentage sets and weekly prescriptions.
- The main question is progression: confirm whether a fixed weekly percentage jump can be encoded with existing percent loads, or whether a new weekly anchor-increase rule is needed.

### Training-Max Wave Research

- Likely fit: exact.
- The repo already has `Training Max Wave`, `training_max_band`, and 4-week percentage prescriptions.
- Research should separate public training-max wave principles from branded supplemental templates so Sheetless can offer original neutral programmes.

### High-Volume Supplemental Wave

- Likely fit: exact or small extension needed.
- Public high-volume strength material often combines percentage main work, 5x10-style supplemental work, and simple assistance categories.
- The current DSL can express training-max main work and 5x10 percent or user-selected supplemental slots.
- Keep implementation names neutral unless a branded template is licensed.

## Expected Research Output

The next agent should produce a follow-up implementation plan, not code, with:

- Ranked programme candidates.
- Source citations and IP-risk decisions.
- Exact DSL mapping for each recommended candidate.
- Any progression rules needed beyond existing rules.
- Any movement catalog gaps.
- A minimal first implementation batch.
- Tests needed to validate generated definitions and progression decisions.

Do not add database migrations, template definitions, or progression code until this research output is reviewed.
