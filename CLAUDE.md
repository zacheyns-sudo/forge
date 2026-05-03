# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
node server.js          # serves on http://localhost:3000
npm start               # same
```

No build step. Edit `index.html` and reload. The service worker caches aggressively in production — in DevTools, enable "Update on reload" under Application → Service Workers during development.

## Architecture

Forge is a **single-file PWA**: all CSS, HTML, and JS live in `index.html`. There is no framework, no bundler, no transpilation. `server.js` is a minimal static file server with SPA fallback.

### File roles
| File | Purpose |
|---|---|
| `index.html` | Everything — CSS, HTML structure, JS logic |
| `server.js` | Static file server (Node, no deps) |
| `sw.js` | Service worker — cache-first for shell assets |
| `manifest.json` | PWA manifest |

### State model (`index.html` JS section)

All state lives in `localStorage` via a flat `state` object. The `K` constant maps logical names to storage keys:

```
K.workouts  → wt_workouts    array of logged session objects
K.prs       → wt_prs         { 'lift::Name': {weight,reps,e1rm,date}, 'run::N': {...} }
K.weekly    → wt_weekly      weekly aggregate cache
K.weight    → wt_weight      bodyweight log entries
K.custom    → wt_custom_lifts  user-defined exercise names
K.key       → wt_key         Anthropic API key
K.plan      → wt_plan        weekly template { dow: { type, exercises?, runType?, ... } }
K.onboarded → wt_onboarded   '1' once first-run setup is done
```

`loadState()` reads all keys into `state` on init. `persist(keys)` writes specified keys back (or all keys if called with no args). Always call `persist(['keyname'])` after mutating state.

### Workout session shape

```js
// Strength
{ id, date, timestamp, type:'strength', exercises:[{name, sets:[{weight,reps,isPR}]}], rpe, feel }

// Run
{ id, date, timestamp, type:'run', distance, time, timeSec, paceSec, runType, hrZone, rpe, feel, notes }

// Other
{ id, date, timestamp, type:'other', label, duration, rpe, feel, notes }

// Rest
{ id, date, timestamp, type:'rest', forced, notes }
```

### Rendering pattern

All UI is rendered by JS functions that write innerHTML into container elements. Nothing is a component — functions are named `render*()` and called directly. Form state is kept in `state.wip` (work-in-progress workout). After any mutation, call the relevant render function to sync the DOM.

The exercise picker is a reusable bottom sheet (`#picker-sheet`) with a `state.pickerContext` flag (`'log'` or `'plan'`) that controls where a selected exercise is added.

### Navigation

`showTab(name)` is the single nav function — it shows the matching `.screen` element and marks the active tab button. Tabs: `today`, `plan`, `prs`.

### AI coach — Chad

Chad is a persistent AI training assistant (floating bottom-sheet chat). Key functions:
- `openChad()` / `closeChad()` — open/close the sheet
- `buildAthleteContext()` — builds the athlete profile string from `state.chadProfile` + `state.chadPins`
- `buildChadSystemPrompt()` — full system prompt for Chad, instructs JSON-only responses
- `callChadAPI()` — multi-turn Anthropic API call using `state.chadMessages` as history
- `sendChadMessage(text)` — adds user message, calls API, handles plan proposals
- `chadStartSetup()` / `chadHandleSetupResponse()` — first-open conversational profile collection
- `renderChadPlanCard(m)` / `window.applyChadPlan(encoded, ts)` — plan proposal cards in chat

`state.chadProfile` replaces the old hardcoded `ATHLETE_CONTEXT`. `fetchStretches` uses `buildAthleteContext()` for its system prompt. All AI calls are optional — the app works fully without a key.

### CSS conventions

CSS custom properties (`--accent`, `--bg`, `--surface`, etc.) are defined in `:root` (light mode) and overridden in `html.dark`. Always use these tokens — never hardcode colours. The `--accent` colour is the primary interactive colour (buttons, active states, dots).

## Active Redesign

A major redesign is in progress. The spec and implementation plan live in:
- `docs/superpowers/specs/2026-05-02-forge-redesign-design.md`
- `docs/superpowers/plans/2026-05-02-forge-redesign.md`

Key changes in flight: new top pill nav (Today · Plan · PRs), Sand + Deep Red colour scheme, weekly plan template, day-strip navigation on Today, bottom-sheet logging flow, first-run setup wizard.

## Worktrees

Use `.worktrees/` for feature branches (already in `.gitignore`).
