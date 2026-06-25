[Skip to content](https://chatgpt.com/share/6a3b4e34-5f34-83ec-85e1-b667a028f850#main)

## Chat history

This is a copy of a shared ChatGPT conversation

Report conversation

#### You said:

If I was to build a workout tracking app and say I wanted to auto-regulate some famous workouts, such as Jim Wendler's 531, Mad Cow's Texas Programming, Starting Strength, like the 5x5, would there be any licence issues with this since this information seems to be publicly available?

If there are licence issues then what would be ways around it? I want to have, basically, using spreadsheets, I want to auto-regulate my workout so there's linear periodization and different block techniques. What would be a safer bet: do we use one of those templates or do we have to have the user create their own using the different methodologies?

Show moreShow less

#### ChatGPT said:

I’ll treat this as product/IP risk rather than pure programming. I’ll verify the legal baseline and the status of the named programmes, then translate it into a practical template strategy for your app.

A useful early distinction: the maths/methodology is usually the safer part; the branded names, exact written tables, book/app content, and “official programme” positioning are where the risk grows.

Thought for 1m 5s

Yes, there **can be licence/IP issues**, even if the programme information is publicly available. Publicly available does **not** mean “free to copy into a commercial app.”

The safer product answer: **build a generic auto-regulation/programming engine first**, then offer your own neutral templates, and only add famous branded templates if you license them or keep them user-created/private.

Not legal advice, but here’s the practical breakdown.

## The core legal distinction

Copyright usually does **not** protect the training _method_ itself: percentages, progressive overload, deload logic, AMRAP sets, RPE/RIR adjustment, linear progression, etc. The U.S. Copyright Office says copyright does not protect ideas, methods, systems, formulas, algorithms, or processes; Singapore’s IPOS similarly frames copyright as protecting the _expression_ of ideas in tangible form. [![](https://www.google.com/s2/favicons?domain=https://www.copyright.gov&sz=128)copyright.gov+1](https://www.copyright.gov/circs/circ31.pdf)

But copyright **can** protect the author’s written explanations, tables, charts, book content, spreadsheet layout, exercise notes, named templates, and the specific selection/arrangement of programme material if copied closely. IPOS says copyright owners control reproduction, publication, communication, and adaptation of their protected works. [![](https://www.google.com/s2/favicons?domain=https://www.ipos.gov.sg&sz=128)ipos.gov.sg](https://www.ipos.gov.sg/about-ip/copyright/introduction-copyright/)

Trademark is the bigger practical risk. Names like **Starting Strength**, **StrongLifts**, **5/3/1**, **Jim Wendler**, etc. can function as brands. IPOS defines a trade mark as a sign used to distinguish one trader’s goods/services from another’s, and registered marks can be licensed or used to protect market share. [![](https://www.google.com/s2/favicons?domain=https://www.ipos.gov.sg&sz=128)ipos.gov.sg](https://www.ipos.gov.sg/about-ip/trade-marks/introduction-trade-marks/) The USPTO’s “likelihood of confusion” standard is the key risk: if users might think your app is official, affiliated, endorsed, or from the same source, you have a problem. [![](https://www.google.com/s2/favicons?domain=https://www.uspto.gov&sz=128)uspto.gov](https://www.uspto.gov/trademarks/search/likelihood-confusion)

## Risk by approach

| Approach | Risk | Why |
| --- | --- | --- |
| “Training max wave progression” with your own algorithm and wording | Low | You are using training concepts, not a brand or copied expression. |
| “Novice linear progression A/B” with your own rules | Low to medium | Safer if it is genuinely generic and not a clone of Starting Strength’s exact presentation. |
| “Volume / light / intensity 3-day method” | Low to medium | Safer than calling it Texas Method, but avoid copying exact article/book tables. |
| “Madcow-style weekly 5x5 ramp” | Medium | “Madcow” is widely public/community-associated, but exact spreadsheets/tables may still be copied expression. |
| “Jim Wendler 5/3/1 template pack” | High | Uses author/brand identity and may imply endorsement. Wendler has official books, and the 5/3/1 ecosystem is commercial. [![](https://www.google.com/s2/favicons?domain=https://www.jimwendler.com&sz=128)JimWendler.com](https://www.jimwendler.com/blogs/jimwendler-com/how-does-5-3-1-forever-measure-up-and-whats-in-it-for-you) |
| “Starting Strength Novice Programme” | High | Starting Strength presents itself as a branded training system with books, coaching, seminars, gyms, and an app. [![](https://www.google.com/s2/favicons?domain=https://startingstrength.com&sz=128)Starting Strength+1](https://startingstrength.com/about) |
| Copying tables from books, PDFs, paid spreadsheets, apps, or subscriber forums | Very high | That is much closer to reproducing protected expression. |

## Important nuance on these specific programmes

**5/3/1:** The basic idea of a training max, percentage waves, AMRAP work, deloads, and calculated progressions is not something I’d worry about as a method. But using “Jim Wendler 5/3/1” as a commercial preset is much riskier. I found a U.S. trademark listing for “JIM WENDLER 5/3/1” that Justia marks as cancelled in 2019, but that is **not** a green light: common-law rights, other marks, other jurisdictions, reputation, and endorsement/confusion risks can still matter. [![](https://www.google.com/s2/favicons?domain=https://trademarks.justia.com&sz=128)Justia Trademarks](https://trademarks.justia.com/857/38/jim-wendler-5-3-85738319.html)

**Starting Strength:** Higher risk as a named template. Their own site describes it as a “system,” has a novice programme page, books, coaching, seminars, gyms, and an official app ecosystem. [![](https://www.google.com/s2/favicons?domain=https://startingstrength.com&sz=128)Starting Strength+2![](https://www.google.com/s2/favicons?domain=https://startingstrength.com&sz=128)Starting Strength+2](https://startingstrength.com/get-started/programs)

**Texas Method:** The method is discussed publicly by Mark Rippetoe on Starting Strength, and Practical Programming is sold as a detailed book on programming across novice/intermediate/advanced lifters. [![](https://www.google.com/s2/favicons?domain=https://startingstrength.com&sz=128)Starting Strength+1](https://startingstrength.com/article/the_texas_method) I would avoid shipping a “Texas Method official template” unless licensed. A generic “volume/light/intensity weekly progression” is safer.

**Madcow / 5x5:** “5x5” itself is a generic training format, but “StrongLifts 5x5” is a branded app/program ecosystem, and the StrongLifts site explicitly offers StrongLifts and Madcow templates inside its own app. [![](https://www.google.com/s2/favicons?domain=https://stronglifts.com&sz=128)Stronglifts](https://stronglifts.com/app/) A generic “weekly ramping 5x5” is safer than using StrongLifts branding.

## The safer product strategy

For your app, I’d separate **programming primitives** from **branded templates**.

Build the app around primitives like:

- Linear progression: add X kg after successful sessions.

- Weekly linear progression: top set or 5x5 target increases weekly.

- Training max percentage work.

- AMRAP-driven e1RM updates.

- RPE/RIR auto-adjustment.

- Deload rules after failed attempts.

- Leader/anchor-style block structure, but under your own terminology.

- Volume / intensity / recovery day structures.

- Hypertrophy, strength, peak, and deload blocks.

- User-defined assistance work.


Then ship your own templates under neutral names:

| Riskier branded name | Safer internal product name |
| --- | --- |
| Starting Strength | Novice Linear A/B |
| StrongLifts 5x5 | Beginner 5x5 Linear |
| Madcow 5x5 | Weekly Ramping 5x5 |
| Texas Method | Volume-Light-Intensity |
| 5/3/1 | Training Max Wave |
| Boring But Big | High-Volume Supplemental Block |

The user can still create their own version manually. For example, they could create a “my 5/3/1 setup” privately, but your app does not need to ship a “Jim Wendler 5/3/1” preset.

## Best MVP policy

I’d do this:

1. **Do not ship famous named templates in v1.**

2. Ship a **template builder / DSL** with generic progression engines.

3. Ship **original templates inspired by common strength principles**, not copied programme tables.

4. Use neutral naming and original explanations.

5. Add a disclaimer like: “Templates are original programming tools and are not affiliated with or endorsed by any named coach, author, book, or programme.”

6. Later, add licensed branded packs if there is demand.


The best feature is not “we copied famous spreadsheets.” It is: **“Build any block-based strength programme without spreadsheets, with auto-regulation built in.”**

That gives you the same user value while lowering IP risk.

Sources

#### You said:

Cool. I like this idea. It makes sense. It's kind of aligned with what I'm currently building at the moment. I just have to rename the template more or less. Can you please make a plan around creating a a DSL system which is flexible enough to be able to support this. We should have to support the different workouts. All those workouts are auto-regulated. The user should be able to create their own workout, like a logger, which is not regulated. They should be able to make a session in an ad hoc session if they want as well and then they can save sessions if they want. We have to think about how this works because there's the workout and there's the sessions themselves.

Show moreShow less

#### ChatGPT said:

The biggest design decision is vocabulary: I would not call everything a “workout.” Use **Programme → Workout Plan → Session → Logged Sets**. That separation will make templates, ad hoc logging, and auto-regulation much easier.

Thought for 33s

Yes — this lines up well with **Sheetless / Bar Pilot**. The product should not be “a collection of famous spreadsheets.” It should be a **programmable strength engine** where famous-style methodologies are just examples of what the DSL can express.

The main goal:

> Let users run structured auto-regulated programmes, create their own templates, or simply log ad hoc sessions — all using the same underlying session/logging model.

## 1\. Core vocabulary

I would separate the domain like this:

| Concept | Meaning |
| --- | --- |
| **Programme Template** | A reusable multi-week structure. Example: “Training Max Wave”, “Novice Linear A/B”, “Weekly Ramping 5x5”. |
| **Programme Instance** | A user’s active run of a template, with their exercises, training maxes, settings, start date, and current state. |
| **Workout Template** | A reusable day/session structure inside a programme. Example: “Day 1 Squat + Bench”, “Upper A”, “Volume Day”. |
| **Planned Session** | A generated workout for a specific date/week/day based on the programme state. |
| **Workout Session** | The actual thing the user performs and logs. This can come from a plan or be ad hoc. |
| **Logged Sets** | The truth. Actual exercise, load, reps, RPE, notes, substitutions, failures, etc. |
| **Regulation Result** | The post-session decision: increase, hold, deload, recalculate e1RM, change training max, repeat week, etc. |

The key principle:

> A template generates planned sessions, but logged sessions are the source of truth.

That lets you support structured programmes, custom workouts, and random ad hoc logging without building three different products.

* * *

# 2\. Three product modes

You probably want three modes from the start.

## Mode 1: Regulated Programme

This is for users following a multi-week plan.

Example safe names:

- **Novice Linear A/B**

- **Beginner 5x5 Linear**

- **Weekly Ramping 5x5**

- **Volume-Light-Intensity**

- **Training Max Wave**

- **Strength + Hypertrophy Block**

- **Powerbuilding Upper/Lower**


These have rules attached:

- Add weight after successful completion.

- Adjust training max based on AMRAP.

- Deload after missed targets.

- Cap increases based on RPE.

- Repeat a week if too many sets fail.

- Swap exercises but preserve movement pattern.


## Mode 2: Custom User Programme

The user creates their own structured plan.

They can say:

- 4 days per week.

- Squat on Monday.

- Bench twice per week.

- Deadlift once per week.

- Use percentage of training max.

- Add 2.5 kg weekly if successful.

- Deload after two failed sessions.


This should use the **same DSL** as your built-in templates.

The difference is just ownership:

```
TypeScript
```

## Mode 3: Ad Hoc Logger

The user just starts a session.

No programme.

No progression.

No rules required.

They can log:

- Exercise

- Sets

- Reps

- Load

- RPE/RIR

- Notes

- Supersets, if needed later

- Bodyweight, readiness, pain score, etc.


Then after the session, they can optionally:

- Save it as a reusable workout.

- Add it to a programme.

- Convert it into a custom template.

- Leave it as a one-off session.


This is important because a lot of serious lifters do not always follow the plan perfectly.

* * *

# 3\. The domain model

I would model it roughly like this.

```
TypeScript
```

```
TypeScript
```

```
TypeScript
```

```
TypeScript
```

```
TypeScript
```

```
TypeScript
```

The **RegulationEvent** is important. You want an audit trail of why the app changed someone’s numbers.

For example:

> Bench training max increased from 100 kg to 102.5 kg because the user completed 5 reps at 95 kg with RPE 8.

* * *

# 4\. The DSL should describe intent, not hardcoded workouts

The DSL should not only say:

> Week 1, Day 1, do 5 sets of 5 at 100 kg.

That is too rigid.

It should say:

> For squat, perform 5 sets of 5 using 80% of the current training max, rounded to the nearest available increment. If all prescribed reps are completed and RPE is below 9, increase the training max next week.

That makes it flexible.

A simplified DSL shape could look like this:

```
JSON
```

This is not the final schema, but it shows the direction.

* * *

# 5\. The DSL needs a few primitive building blocks

To support lots of programming styles, you need primitives rather than hardcoded named programmes.

## Load sources

A set should be able to calculate load from different sources:

```
TypeScript
```

Examples:

- 80% of training max

- Last week + 2.5 kg

- Work up to RPE 8

- 3 sets at same load as top set minus 10%

- Bodyweight pull-ups

- Manual load chosen by user


## Rep targets

```
TypeScript
```

Examples:

- 5 reps

- 3–5 reps

- AMRAP, minimum 5

- Stop at RPE 8

- 30 seconds


## Set structures

```
TypeScript
```

This lets you support:

- 5x5

- Top set + backoffs

- Ramping sets

- AMRAP waves

- Hypertrophy accessories

- Optional assistance work


## Progression rules

```
TypeScript
```

Examples:

- Add 2.5 kg every successful workout.

- Add weight only after all sets hit top of rep range.

- Increase training max after a block.

- Recalculate e1RM from AMRAP.

- Move from accumulation to intensification block.


## Deload rules

```
TypeScript
```

Examples:

- Deload after 2 failed workouts.

- Deload every 4th week.

- Deload if average RPE is too high.

- Deload if readiness/pain score is poor.

- User manually chooses to deload.


* * *

# 6\. Auto-regulation should be rule-based, not template-specific

Instead of writing custom code like:

```
TypeScript
```

You want something more like:

```
TypeScript
```

The engine should process rules in order:

1. Read the completed session.

2. Compare planned targets vs actual logged sets.

3. Calculate performance metrics.

4. Evaluate progression rules.

5. Evaluate deload/failure rules.

6. Update programme state.

7. Generate next planned session.


Example:

```
TypeScript
```

This makes the system flexible enough for lots of methods without tying the app to famous templates.

* * *

# 7\. Programme state is the heart of the system

The template is static.

The programme instance is dynamic.

For each user running a programme, you need state like:

```
JSON
```

The DSL rules should mutate this state in controlled ways.

For example:

```
JSON
```

Do **not** let user-created DSL execute arbitrary JavaScript. Use safe predefined operations only.

* * *

# 8\. Planned vs actual sessions

This is critical.

A planned session may say:

```
TypeScript
```

But the user might log:

```
TypeScript

Squat:
  120 x 5
  120 x 5
  120 x 4
  110 x 5
  110 x 5
```

The logged reality should not overwrite the original plan. Store both:

```
TypeScript

targetLoad: 120
targetReps: 5
actualLoad: 110
actualReps: 5
```

That allows the engine to answer:

- Did they complete the target?

- Did they reduce load?

- Was the session failed, modified, or partially successful?

- Should progression continue?

- Should the programme repeat, deload, or adjust?


This also gives you great analytics later.

* * *

# 9\. Saved workouts are not the same as programmes

A saved workout is just a reusable session structure.

Example:

```
TypeScript

SavedWorkout
  name: "Push Day"
  exercises:
    - Bench Press
    - Incline DB Press
    - Cable Fly
    - Triceps Pushdown
```

It may or may not have progression rules.

I would support three levels:

| Type | Example | Regulation |
| --- | --- | --- |
| **Ad Hoc Session** | User logs today’s random lift | None |
| **Saved Workout** | Reusable “Push Day” | Optional |
| **Programme Template** | 8-week strength block | Full regulation |

This means a casual user can simply log workouts, while a serious lifter can run a full programme.

* * *

# 10\. Template creation UX

The user should not need to write JSON directly.

You can build a form-based creator that generates DSL behind the scenes.

## Step 1: Choose structure

- Single workout

- Weekly plan

- Multi-week programme

- Block-based programme


## Step 2: Choose schedule

- Days per week

- Repeating cycle

- Fixed weekdays or flexible sequence


Example:

- 3 days/week fixed: Mon/Wed/Fri

- 4 sessions in sequence: Session 1, 2, 3, 4, repeat


## Step 3: Add workout days

Example:

- Day 1: Squat + Bench

- Day 2: Deadlift + Press

- Day 3: Bench Volume + Squat Light


## Step 4: Add prescriptions

For each exercise:

- Sets

- Reps

- Load source

- RPE/RIR target

- Optional AMRAP

- Rest time

- Notes


## Step 5: Add progression

Examples:

- Add weight every successful session.

- Add weight weekly.

- Increase reps before increasing load.

- Increase training max after block.

- Recalculate from AMRAP.


## Step 6: Add failure/deload logic

Examples:

- Hold load after one failed session.

- Deload after two failed sessions.

- Repeat week if more than two main lifts fail.

- Reduce training max by 10%.

- Ask user what to do.


## Step 7: Preview generated sessions

Before starting, show:

- Week 1

- Week 2

- Week 3

- Deload week

- Expected load progression


This is important. Users need confidence that the DSL generated what they expected.

* * *

# 11\. Template naming strategy

For your built-in templates, avoid shipping famous names.

Use names like:

| Built-in Template | Inspired Methodology |
| --- | --- |
| **Novice Linear A/B** | Starting Strength / beginner linear progression style |
| **Beginner 5x5 Linear** | Generic 5x5 |
| **Weekly Ramping 5x5** | Madcow-style weekly progression |
| **Volume-Light-Intensity** | Texas Method-style structure |
| **Training Max Wave** | 5/3/1-style percentage wave |
| **Top Set + Backoffs** | Common powerlifting structure |
| **Double Progression Hypertrophy** | Common bodybuilding method |
| **Block Strength Builder** | Accumulation/intensification/realisation |

Internally, the DSL should not care what the template is called. It should only care about rules.

* * *

# 12\. Suggested implementation phases

## Phase 1: Logger foundation

Build the logging model first.

Must support:

- Create ad hoc session

- Add exercises

- Add sets

- Log load/reps/RPE/RIR

- Mark set complete/failed

- Add notes

- Save session as reusable workout


This gives you a useful product even before complex programming exists.

## Phase 2: Saved workouts

Add reusable workouts.

Must support:

- Create saved workout

- Start session from saved workout

- Reorder exercises

- Edit sets

- Copy previous session

- View history per exercise


No auto-regulation yet, or only very light rules.

## Phase 3: Programme templates

Add structured templates.

Must support:

- Programme template schema

- Programme instance

- User inputs

- Generate planned sessions

- Store planned vs actual values

- Template version snapshots


Start with simple templates:

- Novice Linear A/B

- Beginner 5x5 Linear

- Upper/Lower

- Push/Pull/Legs


## Phase 4: Rule engine

Add auto-regulation.

Must support:

- Session success/failure evaluation

- Linear progression

- Double progression

- Training max progression

- Scheduled deload

- Failed session deload

- RPE cap

- AMRAP e1RM update


This is where the app becomes more than a logger.

## Phase 5: Block programming

Add advanced periodisation.

Must support:

- Blocks

- Phases

- Week-to-week changes

- Volume accumulation

- Intensification

- Realisation/peak

- Deload/taper

- Repeating blocks


This lets you build serious powerlifting-style programming.

## Phase 6: User template builder

Add visual programme creation.

Must support:

- Build a programme from UI

- Configure rules without code

- Preview weeks

- Save as private template

- Duplicate and modify system templates


This becomes your moat.

* * *

# 13\. The important technical decisions

## Snapshot template versions

When a user starts a programme, snapshot the template.

Do not let future template edits mutate an active user’s programme.

```
TypeScript

ProgrammeInstance.templateSnapshot = fullTemplateJson;
```

## Store computed targets

Even though targets are generated from rules, store the actual computed target at session creation time.

Example:

```
TypeScript

targetLoad: 122.5
targetReps: 5
targetSource: "75% of squat training max"
```

This prevents historical sessions changing if the formula changes later.

## Keep regulation explainable

Every automatic adjustment should have a reason.

Example:

```
TypeScript

"Deadlift training max held because target reps were missed on set 3."
```

This is a big trust feature.

## Allow manual override

Users must be able to say:

- Increase anyway.

- Hold load.

- Deload.

- Repeat week.

- Skip this session.

- Substitute exercise.

- Ignore this session for progression.


Serious lifters will need this.

* * *

# 14\. My recommended architecture

Think of the system as five services/modules:

```
TypeScript

TemplateService
  validates templates
  versions templates
  creates user templates

ProgrammeService
  starts programme instances
  stores programme state
  manages active programme lifecycle

PlanningEngine
  compiles template + state into planned sessions
  calculates target sets
  applies rounding and unit rules

SessionService
  handles ad hoc sessions
  handles planned sessions
  logs actual sets
  saves workouts

RegulationEngine
  evaluates completed sessions
  applies progression/deload rules
  writes RegulationEvents
  updates ProgrammeInstance state
```

This separation keeps the logger simple while allowing the regulated engine to grow.

* * *

# 15\. The safest product direction

I would position the app as:

> A flexible strength training engine for building, logging, and auto-regulating your own programmes without spreadsheets.

Not:

> An app for running 5/3/1, Starting Strength, Texas Method, and Madcow.

The feature set can still support those styles, but the official product language should be generic:

- Training max waves

- Linear progression

- Weekly ramping 5x5

- Volume/intensity split

- Block periodisation

- RPE-based progression

- AMRAP-based adjustment

- Deload automation


That gives you flexibility, avoids overfitting to famous templates, and keeps the IP risk lower.

My strong recommendation: **build the DSL around generic programming primitives, ship neutral built-in templates, and let users create/duplicate their own named versions privately.**

#### You said:

Are you familiar with Alex Bromley and his full MassTiff base strength 70's bodybuilder workout? Could we also align and fit those in with our DSL?

#### ChatGPT said:

Thought for 20s

Yes — I’m familiar at a **high level**, and I think this is actually a great stress test for your DSL.

Small correction: I think by **“MassTiff”** you probably mean **Bullmastiff**. Bromley’s current ecosystem includes **Bullmastiff**, **70’s Powerlifter**, and **Block** as Base Strength app options, and the app itself advertises readiness checks, performance-based set decisions, and training max updates. [![](https://www.google.com/s2/favicons?domain=https://www.basestrength.com&sz=128)Base Strength](https://www.basestrength.com/the-app)

## Can they fit your DSL?

Yes. Bromley-style programming is very DSL-friendly because it is built around reusable principles:

- multi-week blocks

- 3-week waves

- upper/lower 4-day splits

- main lift + opposite-pattern variation

- bodybuilding accessories

- AMRAP / plus-set feedback

- load jumps based on performance

- readiness/recovery adjustment

- base phase → peak/intensity phase structure


Bullmastiff, for example, is described as a 4-day intermediate programme with base and peak phases, using the four big lifts, developmental variations, bodybuilding work, and a 3-week wave progression where AMRAP performance influences the next week’s jump. [![](https://www.google.com/s2/favicons?domain=https://www.boostcamp.app&sz=128)Boostcamp](https://www.boostcamp.app/coaches/alex-bromley/bullmastiff) 70’s Powerlifter is described as an 18-week, 4-day-per-week intermediate programme with auto-progression in Boostcamp. [![](https://www.google.com/s2/favicons?domain=https://www.boostcamp.app&sz=128)Boostcamp](https://www.boostcamp.app/coaches/alex-bromley/70s-powerlifter)

So yes — structurally, your DSL can absolutely support these.

But commercially, I would **not** ship them as “Alex Bromley Bullmastiff” or “70’s Powerlifter” unless you have permission/licensing.

## The safer framing

Do **not** do this:

> “Run Alex Bromley’s Bullmastiff and 70’s Powerlifter in our app.”

Do this instead:

> “Build old-school strength and powerbuilding blocks using wave progression, plus-set auto-regulation, developmental variations, and bodybuilding volume.”

That gives you the same engine capability without making your app look like it is copying or competing with Bromley’s official material.

Also, Bromley has an active commercial app offering these templates, AI-style readiness adjustment, auto-adjustments, and pricing. That makes the risk higher than with an old anonymous forum spreadsheet. [![](https://www.google.com/s2/favicons?domain=https://www.basestrength.com&sz=128)Base Strength](https://www.basestrength.com/the-app)

## What the DSL needs to support Bromley-style programming

You need these primitives.

### 1\. Phases / blocks

```
TypeScript

Block =
  | "base"
  | "peak"
  | "volume"
  | "intensification"
  | "realisation"
  | "deload";
```

For example:

```
JSON

{
  "blocks": [\
    {\
      "id": "base_phase",\
      "lengthWeeks": 9,\
      "structure": "three_week_waves"\
    },\
    {\
      "id": "peak_phase",\
      "lengthWeeks": 9,\
      "structure": "intensification_waves"\
    }\
  ]
}
```

This lets you model:

- Bullmastiff-style base/peak

- 70’s Powerlifter-style volume/intensity phases

- your own powerbuilding blocks

- deload insertions


* * *

### 2\. Wave progression

You need a generic wave primitive:

```
JSON

{
  "type": "wave_progression",
  "waveLengthWeeks": 3,
  "progressionTarget": "main_lift",
  "progressionMode": "load_and_volume",
  "resetAfterWave": true
}
```

This is useful for any programme where stress rises for a few weeks, then resets or changes.

* * *

### 3\. Plus-set / AMRAP auto-regulation

This is the biggest one.

```
JSON

{
  "set": {
    "type": "plus_set",
    "minimumReps": 6,
    "load": {
      "type": "percent_of_training_max",
      "value": 0.7
    }
  },
  "regulation": {
    "metric": "extra_reps_above_minimum",
    "action": "increase_next_session_load"
  }
}
```

The important thing is that you do **not** hardcode “Bullmastiff logic.” You define a reusable rule:

```
TypeScript

extraReps = actualReps - targetMinimumReps
nextLoad = currentLoad + adjustment(extraReps)
```

That same primitive can support:

- Training max waves

- AMRAP-based progression

- Rep PR adjustments

- top-set recalculation

- estimated 1RM updates


* * *

### 4\. Developmental variations

Bromley-style programming often uses a main lift plus related variations. Bullmastiff is publicly described as pairing each main lift with a developmental variation for the opposite movement pattern. [![](https://www.google.com/s2/favicons?domain=https://www.boostcamp.app&sz=128)Boostcamp](https://www.boostcamp.app/coaches/alex-bromley/bullmastiff)

Your DSL should support exercise slots, not fixed exercises:

```
JSON

{
  "exerciseSlots": [\
    {\
      "slot": "main_lift",\
      "movementPattern": "squat",\
      "allowedExercises": ["back_squat", "front_squat", "ssb_squat"]\
    },\
    {\
      "slot": "developmental_variation",\
      "movementPattern": "deadlift",\
      "allowedExercises": ["romanian_deadlift", "stiff_leg_deadlift", "paused_deadlift"]\
    },\
    {\
      "slot": "bodybuilding_accessory",\
      "muscleGroup": "hamstrings"\
    }\
  ]
}
```

This is very powerful because users can swap exercises while preserving the programme intent.

* * *

### 5\. Volume escalation

You need volume progression that changes sets, reps, or RPE over time:

```
JSON

{
  "type": "volume_escalation",
  "target": "developmental_variation",
  "progression": [\
    { "weekOffset": 1, "sets": 3, "reps": 12, "rpe": 6 },\
    { "weekOffset": 2, "sets": 4, "reps": 12, "rpe": 7 },\
    { "weekOffset": 3, "sets": 5, "reps": 12, "rpe": 8 }\
  ]
}
```

This lets you support:

- bodybuilding accumulation

- accessories ramping up

- volume blocks

- fatigue-building phases

- old-school high-volume templates


* * *

### 6\. Readiness-based scaling

Because Base Strength’s own app uses readiness checks to influence the day’s prescription, your DSL should have this concept from the start. [![](https://www.google.com/s2/favicons?domain=https://www.basestrength.com&sz=128)Base Strength](https://www.basestrength.com/the-app)

```
JSON

{
  "readiness": {
    "inputs": ["sleep", "stress", "soreness", "motivation", "jointPain"],
    "scalingRules": [\
      {\
        "condition": "readiness_score <= 2",\
        "action": {\
          "type": "reduce_volume",\
          "amount": 0.25\
        }\
      },\
      {\
        "condition": "readiness_score >= 4",\
        "action": {\
          "type": "allow_plus_set"\
        }\
      }\
    ]
  }
}
```

This is where your app can become genuinely better than a spreadsheet.

* * *

## How I would represent a Bromley-style template safely

Instead of:

```

Bullmastiff
```

Use:

```

Old School Wave Powerbuilding
```

Instead of:

```

70’s Powerlifter
```

Use:

```

Classic Volume Strength Block
```

Instead of:

```

Base Strength AI
```

Use:

```

Readiness-Based Strength Engine
```

Possible built-in template names:

| Riskier name | Safer name |
| --- | --- |
| Bullmastiff | Old School Wave Powerbuilding |
| 70’s Powerlifter | Classic Volume Strength |
| Base Strength | Barbell Base Builder |
| Bromley-style block | Wave-Based Strength Block |
| Doug Young progression | Plus-Set Wave Progression |

## My recommendation

Yes, design the DSL so it can express Bromley-style programming. But do **not** ship Bromley’s exact named templates, exact tables, copied notes, or official programme structure as a product feature unless licensed.

The safe strategy:

1. Build **generic primitives**: waves, phases, plus sets, developmental lifts, bodybuilding volume, readiness scaling.

2. Ship your own templates with neutral names.

3. Let users create private templates manually.

4. Avoid copying book/app/PDF notes or exact week-by-week programme tables.

5. Later, if the app gains traction, approach coaches like Bromley for official licensed template packs.


This is actually a strong direction for your app because your DSL becomes broad enough for **5/3/1-style**, **Texas-style**, **linear progression**, **Bromley-style**, and your own hybrid powerbuilding blocks without legally or technically coupling yourself to any one coach.

Sources

#### You said:

Yeah I like this idea. How would the wizard look for the programmes? Can users pick predefined workouts from these templates, which we just generically brand and name? Also when it comes to creating a workout, how should the wizard for this flow look?

#### ChatGPT said:

I’d split the UX into two wizards, not one: **Programme Wizard** for multi-week progression, and **Workout Builder** for reusable/ad hoc sessions. They can share components, but the mental model should be different.

Thought for 9s

Yes — users should be able to pick **predefined workouts from generically branded programme templates**, but the app should treat them as **editable building blocks**, not sacred named programmes.

The clean model:

> **Programme = progression system over time**
>
> **Workout = reusable session structure**
>
> **Session = what actually happened today**

So the wizard should let users start from either side:

1. “I want a full programme.”

2. “I just want to build/log a workout.”

3. “I want to save today’s session as something reusable.”


* * *

# 1\. Programme Wizard

This is for users who want a multi-week structured plan.

## Entry point

Main CTA:

```

Create Programme
```

Then show three options:

```

Start from Template
Build My Own
Import / Duplicate Existing
```

For MVP, I’d focus on the first two.

* * *

# 2\. Programme Wizard flow

## Step 1: Choose goal

Ask:

```

What are you training for?
```

Options:

- Strength

- Powerbuilding

- Hypertrophy

- General fitness

- Peaking / testing maxes

- Rehab / return to training, maybe later


This filters available templates.

Example cards:

```

Strength
Build your main lifts with planned progression.

Powerbuilding
Main lifts plus bodybuilding volume.

Hypertrophy
Higher-volume muscle-building blocks.

Custom
Build your own structure from scratch.
```

* * *

## Step 2: Choose training style

This is where your generic branded templates appear.

Example cards:

```

Novice Linear A/B
Simple full-body progression for newer lifters.

Beginner 5x5 Linear
Straight sets, simple load increases, repeatable structure.

Weekly Ramping 5x5
A weekly progression model with ramping sets and a heavier top set.

Volume-Light-Intensity
A three-day strength structure with separate volume, recovery, and intensity days.

Training Max Wave
Percentage-based waves using a conservative training max.

Old School Wave Powerbuilding
Main lifts, developmental variations, and bodybuilding accessories.

Classic Volume Strength Block
Higher-volume strength work with block-based progression.

Custom Programme
Start from a blank programme builder.
```

Internally, these are just DSL templates.

Do **not** expose “inspired by 5/3/1” or “Bromley-style” in the product UI. Keep that in your internal mapping only.

* * *

## Step 3: Choose frequency and schedule

Ask:

```

How many days per week do you want to train?
```

Options:

- 2 days

- 3 days

- 4 days

- 5 days

- Flexible sequence


Then:

```

Do you want fixed training days?
```

Example:

- Monday / Wednesday / Friday

- Tuesday / Thursday / Saturday

- Flexible: “Next session whenever I train”


This is important because serious lifters often do not follow fixed weekdays.

I would support both:

```
TypeScript

schedule.type = "fixed_weekdays" | "floating_sequence";
```

Example:

```

Fixed Weekdays:
Monday = Workout A
Wednesday = Workout B
Friday = Workout A

Floating Sequence:
Next session is always the next workout in the cycle.
```

For MVP, **floating sequence** is much easier and more forgiving.

* * *

## Step 4: Configure main lifts

Ask the user to pick their main lift variations.

Example:

```

Choose your main lifts
```

| Movement | Default | User can change to |
| --- | --- | --- |
| Squat | Back Squat | Front Squat, SSB Squat, High-Bar Squat |
| Bench | Bench Press | Close-Grip Bench, Incline Bench |
| Deadlift | Conventional Deadlift | Sumo Deadlift, Trap Bar Deadlift |
| Press | Overhead Press | Seated Press, Push Press |

This maps to exercise slots:

```
TypeScript

main_squat
main_bench
main_deadlift
main_press
```

This is better than hardcoding exact exercises.

* * *

## Step 5: Enter baselines

The app asks for one of these:

```

How should we calculate your starting loads?
```

Options:

- I know my 1RMs

- I know my training maxes

- Estimate from recent sets

- Start conservatively

- I’ll enter loads manually


Example fields:

```

Squat 1RM: 160 kg
Bench 1RM: 110 kg
Deadlift 1RM: 200 kg
Press 1RM: 70 kg
```

Then:

```

Training max percentage:
[85%] [90%] [Custom]
```

For beginner linear templates, you may ask for starting working weights instead:

```

Starting squat work weight: 80 kg
Starting bench work weight: 60 kg
Starting deadlift work weight: 100 kg
```

The wizard should adapt based on template type.

* * *

## Step 6: Pick workout days from the template

Yes, users should be able to pick predefined workouts from a selected template.

Example for **Old School Wave Powerbuilding**:

```

This programme includes 4 workout days:

Day 1 — Lower Strength
Main squat, deadlift variation, quads, hamstrings, abs

Day 2 — Upper Strength
Main bench, press variation, back, triceps

Day 3 — Lower Volume
Main deadlift, squat variation, posterior chain, abs

Day 4 — Upper Volume
Main press, bench variation, back, shoulders, arms
```

Then allow:

```

Use all 4 days
Remove a day
Swap a day
Edit accessories
```

For the first version, I would allow accessory edits but keep the core structure locked unless they duplicate into custom mode.

Example:

```

Core lifts are locked for this template.
Accessories can be edited.
To change the programme structure, duplicate as custom.
```

That avoids users accidentally breaking the progression logic.

* * *

## Step 7: Configure auto-regulation

Ask this in friendly terms, not DSL terms.

```

How aggressive should progression be?
```

Options:

```

Conservative
Smaller jumps, more holds, safer deloads.

Balanced
Recommended for most users.

Aggressive
Larger jumps, fewer holds, more performance-driven.
```

Then advanced settings:

```

When I fail prescribed reps:
- Hold weight next time
- Repeat the workout
- Deload after 2 failed sessions
- Ask me each time

When I exceed targets:
- Increase next load
- Increase training max
- Estimate new max from performance
- Ask me before changing
```

For MVP, I’d use presets:

```
TypeScript

regulationProfile = "conservative" | "balanced" | "aggressive";
```

Then later expose advanced custom rules.

* * *

## Step 8: Accessories and substitutions

The app should give slots, not fixed mandatory exercises.

Example:

```

Back accessory
Choose one:
- Barbell Row
- Lat Pulldown
- Pull-up
- Chest-Supported Row
- Custom
```

The template says:

```
TypeScript

slot = "horizontal_pull"
```

The user picks the specific exercise.

This lets your generic templates feel personal without damaging the progression model.

* * *

## Step 9: Preview programme

Before starting, show a generated preview.

```

Programme preview

Week 1
Day 1 Lower Strength
Squat: 3 x 5 @ 100 kg
RDL: 3 x 8 @ RPE 7
Leg Press: 3 x 12
Abs: 3 x 15

Day 2 Upper Strength
Bench: 3 x 5 @ 72.5 kg
Press Variation: 3 x 8
Rows: 4 x 10
Triceps: 3 x 12
```

Then:

```

View first week
View full block
View progression rules
```

This builds trust.

Users should be able to see:

- Week 1 loads

- Deload week

- How progression works

- What happens after failure

- What happens after overperformance


* * *

## Step 10: Start programme

Final screen:

```

Start Programme
```

Then create:

```
TypeScript

ProgrammeInstance
TemplateSnapshot
ProgrammeState
PlannedSessions
```

Important: when they start, snapshot the template version.

* * *

# 3\. Programme Wizard summary

The full programme wizard:

```

Create Programme
→ Choose goal
→ Choose training style/template
→ Choose frequency/schedule
→ Choose main lifts
→ Enter baselines
→ Pick/edit workout days
→ Configure auto-regulation
→ Choose accessories/substitutions
→ Preview programme
→ Start
```

For MVP, you can simplify to:

```

Template
→ Schedule
→ Lifts & numbers
→ Accessories
→ Preview
→ Start
```

* * *

# 4\. Workout Builder Wizard

This is different. A workout is just a reusable session structure.

Entry points:

```

Create Workout
Start Empty Session
Save Completed Session as Workout
Duplicate Existing Workout
```

## Workout Builder Step 1: Choose workout type

Ask:

```

What kind of workout are you creating?
```

Options:

```

Strength
Main lift focused.

Hypertrophy
Muscle group focused.

Full Body
Multiple movement patterns.

Upper / Lower
Split-based training.

Custom
Start blank.
```

* * *

## Step 2: Choose structure

Ask:

```

How do you want to build it?
```

Options:

```

Start from blank
Use a workout template
Copy previous workout
Build from muscle groups
Build from movement patterns
```

Example predefined workout templates:

```

Lower Strength
Squat, hinge, quad accessory, hamstrings, core

Upper Strength
Bench, press, row, pull, triceps

Full Body A
Squat, bench, row, hinge, core

Push Day
Press, incline press, fly, shoulders, triceps

Pull Day
Deadlift or row, pull-down, row, rear delts, biceps

Leg Day
Squat or leg press, hinge, quad, hamstrings, calves
```

These are not programmes. They do not necessarily progress unless attached to a programme or given rules.

* * *

## Step 3: Add exercises

For each exercise, user chooses:

```

Exercise
Sets
Reps
Load target
RPE/RIR
Rest
Notes
```

Example:

```

Back Squat
5 sets
5 reps
Load: manual
Rest: 3–5 min
```

Or:

```

Bench Press
Top set: 1 x 5 @ RPE 8
Backoffs: 3 x 5 at -10%
```

The workout builder should support simple and advanced modes.

* * *

# 5\. Simple vs Advanced workout creation

## Simple mode

For normal users:

```

Exercise
Sets
Reps
Weight
Rest
```

Example:

```

Bench Press
3 sets of 8
```

## Advanced mode

For power users:

```

Top set
Backoff sets
AMRAP
RPE target
RIR target
Percentage of training max
Progression rule
Deload rule
```

Example:

```

Bench Press
Work up to 1 x 5 @ RPE 8
Then 3 x 5 at 90% of top set
```

Do not force advanced DSL complexity on everyone.

* * *

# 6\. Workout progression options

When saving a workout, ask:

```

Should this workout have progression?
```

Options:

```

No, just save the workout
Use previous performance
Add weight when completed
Use double progression
Use RPE/RIR
Custom
```

This creates three types of saved workouts:

| Type | Meaning |
| --- | --- |
| Static Workout | Same structure, manual loads |
| Lightly Regulated Workout | Progresses based on previous performance |
| Programme Workout | Controlled by a full programme |

Example:

```

Push Day
Progression: Double progression
Rule: When all sets hit 12 reps, increase load next time.
```

This is useful for people who do not want a full programme but still want smart progression.

* * *

# 7\. Ad hoc session flow

This should be extremely fast.

```

Start Session
→ Add exercise
→ Add sets
→ Log
→ Finish
```

After finishing:

```

What do you want to do with this session?
```

Options:

```

Save to history only
Save as reusable workout
Add to active programme as extra session
Use as baseline for a new programme
```

That last option is powerful.

Example:

> User logs a heavy squat day.
>
> App says: “Use this session to estimate your squat baseline?”

* * *

# 8\. How predefined template workouts should work

Yes, users can pick workouts from templates, but I’d treat them as **template workout blocks**.

Example library:

```

Workout Blocks

Lower Strength
Upper Strength
Lower Volume
Upper Volume
Full Body A
Full Body B
Squat Focus
Bench Focus
Deadlift Focus
Press Focus
Push Hypertrophy
Pull Hypertrophy
Leg Hypertrophy
```

Each block has slots:

```

Lower Strength
1. Main squat
2. Secondary hinge
3. Quad accessory
4. Hamstring accessory
5. Core
```

When user picks it, they fill the slots:

```

Main squat → Back Squat
Secondary hinge → Romanian Deadlift
Quad accessory → Leg Press
Hamstring accessory → Leg Curl
Core → Hanging Leg Raise
```

This is much safer and more flexible than shipping exact named workouts.

* * *

# 9\. Relationship between programme, workouts, and sessions

This is how I’d model the flow:

```

Programme Template
  contains Workout Templates
    generate Planned Sessions
      become Workout Sessions
        contain Logged Sets
```

For ad hoc:

```

Ad Hoc Workout Session
  contains Logged Sets
    can be saved as Saved Workout
```

For saved workouts:

```

Saved Workout
  creates Workout Session
    can optionally use progression
```

So the same logger handles everything.

* * *

# 10\. UX example

A user chooses:

```

Create Programme
→ Powerbuilding
→ Old School Wave Powerbuilding
→ 4 days/week
→ Floating schedule
→ Back Squat, Bench, Deadlift, Press
→ Enter 1RMs
→ Pick accessories
→ Balanced auto-regulation
→ Preview
→ Start
```

Then the app creates:

```

Active Programme: Old School Wave Powerbuilding
Next Session: Lower Strength
```

The user taps:

```

Start Session
```

They see:

```

Back Squat
Set 1: 100 kg x 6
Set 2: 100 kg x 6
Set 3: 100 kg x 6+
```

They log:

```

100 kg x 10 @ RPE 9
```

After session:

```

Great session.

Squat exceeded target by 4 reps.
Next squat load increased by 5 kg.

Accept adjustment?
[Accept] [Edit] [Hold Load]
```

This is exactly where your app becomes more useful than spreadsheets.

* * *

# 11\. MVP recommendation

For first version, I’d build:

## Programme templates

- Novice Linear A/B

- Beginner 5x5 Linear

- Upper/Lower Strength

- Training Max Wave

- Old School Wave Powerbuilding


## Workout templates

- Full Body A

- Full Body B

- Lower Strength

- Upper Strength

- Lower Volume

- Upper Volume

- Push

- Pull

- Legs

- Squat Focus

- Bench Focus

- Deadlift Focus


## Auto-regulation rules

- Add weight on success

- Hold weight on failure

- Deload after repeated failure

- Double progression

- AMRAP-based adjustment

- RPE cap

- Manual override


Do not start with a fully open-ended DSL UI. Build the DSL underneath, but expose safe, friendly presets first.

* * *

# 12\. The final product shape

I’d make the app navigation something like:

```

Today
Programmes
Workouts
History
Exercises
Settings
```

Where:

```

Today
Shows next planned session or start ad hoc session.

Programmes
Create/run/edit multi-week plans.

Workouts
Reusable standalone workouts.

History
Actual logged sessions.

Exercises
Exercise library and personal records.
```

The wizard should feel simple, but underneath it generates your DSL.

The best UX principle:

> Users should feel like they are choosing training options, not programming a schema.

So the user sees:

```

Add weight when I complete all sets
```

But your system stores:

```
JSON

{
  "trigger": "session_completed",
  "condition": {
    "allTargetSetsCompleted": true
  },
  "action": {
    "type": "increase_load",
    "amount": 2.5
  }
}
```

That is the sweet spot: beginner-friendly UI, power-user capability underneath.

Voice

ChatGPT is AI and can make mistakes.