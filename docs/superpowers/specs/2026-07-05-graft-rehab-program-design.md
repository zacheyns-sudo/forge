# Graft Rehab Program — Design

**Date:** 2026-07-05
**Status:** Approved (direction), implementing

## Problem

The user is mid-rehab for an Achilles injury and has an 8-week dated recovery
program ("Graft — Summer Routine & Achilles Rebuild", 2026-07-06 → 2026-08-30)
drawn up in a spreadsheet. They want it hard-coded into Forge so the app drives
their rehab block.

Forge's existing Plan is a **repeating weekly template** keyed by day-of-week
(`state.plan[dow]`). The Graft plan is a **fixed dated calendar** where volume
ramps every week and includes a `rehab` session type Forge doesn't model, plus
reference material (Rehab Workout A/B exercise tables, a daily morning routine,
and a pain-rule guide). It cannot be poured into the weekly template without
losing the week-by-week progression.

## Decisions (from user)

1. **The Plan screen becomes the Graft program.** While the program is active it
   takes preference over the day-of-week weekly template everywhere it applies.
   The legacy weekly-template editor stays reachable via a secondary link so no
   existing functionality is destroyed.
2. **Today integration:** reference view **plus** a today's-session banner. When
   the current date falls inside the program window, the Today screen surfaces
   the prescribed Graft session, taking preference over `state.plan[dow]`.
   Read-only — the user still logs sessions through the normal flow underneath.

## Approach

Embed the cleaned plan as a hard-coded `GRAFT_PROGRAM` constant in `index.html`
(single-file PWA — no external data). Fix the source's encoding garble on the way
in (`Â·`→`·`, `Ã`→`×`, `Â°`→`°`, `â`→`–`).

### Data shape (cleaned)

```
GRAFT_PROGRAM = {
  meta:   { name, start:'2026-07-06', weeks:8, description },
  colorKey: { easy, hard, long, rehab, rest },        // hex accents per type
  weeks:  [ { week, label, days:[ { day, date, type, session, morning, trainTime } ] } ],
  exercises: { workoutA:{label,exercises:[{name,sets,reps,tempo,notes}]},
               workoutB:{...}, morningRoutine:{label,exercises:[{name,duration,notes}]} },
  painRule: { '0-3', '4+', morning_stiffness, '24-48h_soreness' }
}
```

### Helpers

- `graftDayFor(dateStr)` → the day object for a date (with its week #/label), or `null`.
- `graftCurrentWeek()` → week index containing today (clamped to 1..8).
- `graftWorkoutForWeek(week)` → `workoutA` for weeks ≤2, else `workoutB`.
- `graftTypeMeta(type)` → `{ label, color }` for pills/dots.

### Plan screen (`renderPlanScreen`)

Primary view = Graft program:
- Header: program name, date range, "Week X of 8" (current week).
- Week selector strip (1–8), defaults to current week.
- Selected week's 7 days as cards: day/date, coloured type pill, session text,
  optional morning + train-time line. Rehab day cards expand to the relevant
  Workout A/B exercise table.
- Reference cards below: Daily Morning Routine, Pain-rule guide.
- Secondary link at bottom: "Edit weekly template →" swaps to the existing
  day-of-week editor (state preserved via `planMode` toggle).

### Today screen

- `renderDayStrip`: a date's dot is "planned" when `graftDayFor(date)` exists and
  its type ≠ `rest` (preferred over `state.plan[dow]`).
- `renderDayContent`: compute `graftDayFor(dateStr)` first. If present it drives
  the prescribed-session card (banner) for today/future/past-unlogged states,
  taking preference over the `state.plan`-based view. Logged days still show the
  logged card, with the prescribed banner above for comparison. Rehab days link
  to their exercise detail. Logging flow is unchanged.

## Scope / non-goals

- No new persisted state; `GRAFT_PROGRAM` is static code. Existing `state.plan`,
  logging, PRs, and Chad are untouched.
- No editing of the Graft program in-app (it's a fixed prescription).
- Adherence tracking beyond the existing logged/planned dots is out of scope.

## Risks

- Type mismatch (`rehab`/`easy`/`hard`/`long` vs Forge's strength/run/other/rest):
  handled purely at the display layer; logging still uses Forge's own types.
- Pastel `colorKey` hexes must stay legible in dark mode → used as small accents
  (dot / pill / left-border), never as text backgrounds behind body copy.
