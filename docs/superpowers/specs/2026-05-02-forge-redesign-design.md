# Forge Redesign — Design Spec
Date: 2026-05-02

## Overview

A major UX redesign of Forge (a single-file PWA workout tracker) inspired by RUNNA. The core shift: from a reactive log-after-the-fact app to a plan-driven daily training app. You plan your week once, then each day Forge shows exactly what you're doing and lets you log it in one flow.

---

## Navigation

**Replace** the current bottom nav (4 emoji-icon tabs) with a top pill row.

- Three tabs: **Today · Plan · PRs**
- Pills sit just below the top header bar
- Active pill: accent-coloured background + white text
- Inactive pills: surface-2 background + muted text
- No bottom navigation bar — full screen height reclaimed for content

---

## Colour Scheme

Replace the current Warm Cream palette with **Sand + Deep Red**.

Dark mode toggle is preserved (user can still switch to dark mode, dark palette unchanged from current).

### Light mode tokens (replace current `:root` block)
| Token | Value |
|---|---|
| `--bg` | `#fdf8f0` |
| `--surface` | `#fffdf9` |
| `--surface-2` | `#f5ede0` |
| `--surface-3` | `#ede3d2` |
| `--border` | `#e8dece` |
| `--border-2` | `#d4c4aa` |
| `--text` | `#1c1208` |
| `--muted` | `#a0906e` |
| `--muted-2` | `#c8b89a` |
| `--accent` | `#991b1b` |
| `--accent-dim` | `rgba(153, 27, 27, 0.10)` |
| `--topbar-bg` | `#fdf8f0` |
| `--nav-bg` | `rgba(253, 248, 240, 0.94)` |
| `--bg-fade` | `rgba(253, 248, 240, 0)` |
| `--err-tint` | `#fde8e8` |

---

## Today Screen

The primary screen. Combines day navigation, plan display, and workout logging in one place.

### Day strip
- Horizontally scrollable row of days spanning ~2 weeks back and 1 week forward
- Each day shows: abbreviated day name (MON, TUE…), date number, and a status dot below
  - Filled accent dot = workout logged
  - Empty dot = workout planned but not logged
  - No dot = rest day or unplanned
- Today is highlighted with a filled accent circle around the date number, labelled "TODAY"
- Tapping any day loads that day's content below

### Header
- Top bar title shows the selected day's date (e.g. "Friday, 2 May") instead of a static "Today" label
- When the selected day is today, it shows "Today" instead

### Day content (below the strip)
- **Today (no plan set):** prompt to set up a plan, link to Plan screen; secondary "Log a workout anyway" button
- **Today (plan set, not yet logged):** workout name + exercise list preview + "Start Workout" button; secondary "Log something different" link for unplanned sessions
- **Today (logged):** completed workout summary (same as past day view)
- **Past day (logged):** read-only workout summary — exercise names, sets, weights, reps logged
- **Past day (not logged):** shows what was planned, greyed out, with a note "Not logged"; secondary "Log it late" button opens the sheet
- **Future day:** shows what's planned, no action button
- **Rest day (any):** shows "Rest" label; secondary "Log a workout anyway" button for unplanned sessions

### Unplanned workouts
If a user taps "Log a workout anyway" or "Log something different", the bottom sheet opens with no pre-populated exercises — the type selector is shown first (Strength / Run / Other), then the standard form. This preserves the ability to log anything on any day without needing the Log tab.

### Starting a workout (bottom sheet)
- Tapping "Start Workout" slides up a bottom sheet
- Sheet contains the full logging form, pre-populated from the template — but everything is editable:
  - For strength days: exercise cards with exercise name + sets/reps rows, previous session's values shown as placeholder ghost text. User can swap exercises, add new ones, or remove any before saving. The template is a default, not a lock.
  - For run days: distance, time, run type (Easy Run / Hard Run / Long Run), HR zone fields
  - For other days: activity name + duration + notes
- User fills in actual values, taps **Save Workout**
- Sheet dismisses, day is marked as logged (filled dot), summary shown
- Edits made in the sheet do not update the template — only the logged session is affected

---

## Plan Screen

Weekly template builder. A repeating schedule — same pattern every week.

### Layout
- Mon–Sun row of day pills at the top (always visible)
- Tapping a day opens that day's editor below (or as a sub-panel)

### Day editor
- Workout type selector: **Strength / Run / Rest / Other**
- If Strength: exercise list (same picker as current — search + custom entry)
  - Exercises saved here are the default set for that day; user fills in weights/reps on the day
  - No sets/reps pre-filled in the template — just the exercise names
- If Run: run type selector (**Easy Run / Hard Run / Long Run**) + optional target distance
- If Rest or Other: optional notes field
- Changes save immediately (no explicit save button needed per day)

---

## First-Run Setup (Onboarding)

Shown once on first launch when no plan exists. Can be skipped.

### Flow
1. Welcome screen: "Let's set up your week" — brief explanation, **Get Started** + **Skip** buttons
2. Step through Mon → Sun one day at a time:
   - Day name + date shown prominently
   - Workout type selector (Strength / Run / Rest / Other)
   - If Strength: optional exercise picker (same as Plan screen day editor)
   - **Next** button advances to the next day
3. Final step: "You're set. Let's train." → lands on Today screen
4. Skipping at any point lands on Today; user can complete setup via Plan tab

### State
- Onboarding complete flag stored in localStorage: `wt_onboarded = "1"`
- If flag not present on load, show onboarding before rendering main UI

---

## PRs Screen

Unchanged from current implementation. Lift and run personal records remain exactly as-is.

---

## Data Model Changes

### New: `wt_plan` (localStorage)
Weekly template. Keyed by day of week (0 = Sunday, 1 = Monday … 6 = Saturday).

```json
{
  "1": { "type": "strength", "exercises": ["Squat", "RDL", "Leg Press"] },
  "2": { "type": "run", "runType": "Easy Run", "targetDistance": 10 },
  "3": { "type": "rest" },
  "4": { "type": "strength", "exercises": ["Bench Press", "Row", "OHP"] },
  "5": { "type": "run", "runType": "Easy" },
  "6": { "type": "strength", "exercises": ["Squat", "RDL", "Calf Raise"] },
  "0": { "type": "rest" }
}
```

### New: `wt_onboarded` (localStorage)
String `"1"` when first-run setup has been completed or skipped.

### Existing: `wt_workouts`
Unchanged. Workouts are still stored as a flat array of logged sessions. The Today screen reads this array to find if a given date has a logged session.

### Removed from state
- `wt_lastType` — no longer needed (type comes from the plan)
- `state.wip` persisting across type changes — still used within a session but cleared on sheet dismiss

### Layout token changes
- `--nav-h` (68px bottom nav height) — removed; body no longer needs bottom padding for a nav bar
- `body` padding-bottom changes from `calc(var(--nav-h) + var(--sa-bot))` to `var(--sa-bot)` (safe area only)

---

## What Is Removed

| Removed | Replaced by |
|---|---|
| Bottom nav bar | Top pill row |
| Log tab | Bottom sheet launched from Today |
| History tab | Tap back through days on Today strip |
| Emoji nav icons (＋ ≡ ◔ ★) | Text pill labels |

---

## Out of Scope

- User accounts / backend sync (future consideration)
- Push notifications for planned workouts
- AI coach feature (preserved as-is, not modified)
