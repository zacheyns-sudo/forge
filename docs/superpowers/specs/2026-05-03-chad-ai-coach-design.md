# Chad — AI Coach Design Spec
Date: 2026-05-03

## Overview

Chad is a persistent AI training assistant embedded in Forge as a floating bottom-sheet chat interface. He replaces the hardcoded `ATHLETE_CONTEXT` with a user-defined profile and training block system, adds a two-tier memory model, and can propose changes directly to the weekly plan template.

---

## UI

### Floating button
A small fixed button sits at the bottom-right of every screen (above the safe-area inset), visible on all three tabs. Labelled "Chad" with a chat icon. Tapping opens the Chad bottom sheet.

### Bottom sheet
Same slide-up animation and `.sheet` / `.sheet-backdrop` CSS pattern as the log sheet. Full-height.

**Header row:**
- "Chad" title
- Active training block chip (e.g. "Get Shredded · 8 weeks left")
- Close button (✕)

**Conversation area:**
- Scrollable message thread
- User messages: right-aligned, accent background
- Chad messages: left-aligned, surface-2 background
- **Plan proposal cards**: special message type rendered inline — shows a compact Mon–Sun day grid with the proposed workout types, plus **Apply Plan** and **Dismiss** buttons

**Pinned memories strip:**
- Collapsible row above the input, showing existing pins as chips
- Tap any pin to delete it

**Input row:**
- Text input + Send button
- "📌" toggle button — when active, the next message sent is saved as a pinned memory

---

## User Profile + Training Blocks

### First open
Chad introduces himself conversationally and collects the user's profile through natural prompts (not a form):
1. Intro: "Hi, I'm Chad — your personal online training assistant. Before we get started, let me learn a bit about you."
2. Collects: age, height, weight, current fitness level, primary goal, and training block end date.

Profile saved to `wt_chad_profile`:
```json
{
  "age": 20,
  "height": "6'3\"",
  "weight": "85kg",
  "fitnessLevel": "intermediate",
  "goal": "Get Shredded",
  "blockStart": "2026-05-03",
  "blockEnd": "2026-07-26"
}
```

### Block expiry
When `blockEnd` is in the past on next open, Chad prompts: "Your 'Get Shredded' block ended — ready to set your next goal?" The expired block is archived to `wt_chad_blocks` (array). A new block replaces `wt_chad_profile.goal / blockStart / blockEnd`.

### Dynamic system prompt
Every Claude API call builds the system prompt from:
- Profile fields (replaces hardcoded `ATHLETE_CONTEXT`)
- Active training block + days remaining
- All pinned memories

No hardcoded athlete context remains in the codebase.

---

## Memory System

### Pinned memories — `wt_chad_pins`
Array of strings. Permanent — no expiry.

Added when:
- User toggles "📌" before sending a message (user-initiated only)

Included in every system prompt. User can delete individual pins via the strip above the input.

### Conversation cache — `wt_chad_messages`
Array of `{ role: 'user'|'assistant', content: string, timestamp: number }`. Capped at 30 messages.

On every open: if the most recent message timestamp is older than 48 hours, the cache is cleared. Profile and pins are unaffected.

Sent to Claude as the `messages` array on each turn (up to the 30-message cap).

---

## Plan Modification Flow

### API response format
Chad uses `callClaudeJSON()`. Every response from Claude must be valid JSON in one of two shapes:

```json
{ "type": "message", "content": "Your reply text here." }
```
```json
{
  "type": "plan_proposal",
  "content": "Explanation of the change and reasoning.",
  "days": {
    "1": { "type": "strength", "exercises": ["Squat", "RDL"] },
    "2": { "type": "run", "runType": "Easy Run" },
    "3": { "type": "rest" }
  }
}
```

The system prompt instructs Claude to always return one of these two shapes. `days` keys are day-of-week integers (0 = Sunday … 6 = Saturday). Only days being changed are included — omitted days keep their existing plan.

### Rendering

When Chad proposes a schedule change, a **plan proposal card** is rendered as a special message type inline in the chat:

1. Chad's explanation text (reasoning for the change)
2. Compact day grid: Mon–Sun showing proposed workout type per day (Strength / Run / Rest / Other)
3. **Apply Plan** button — merges the proposed days into `state.plan`, calls `persist(['plan'])`, re-renders Plan and Today screens
4. **Dismiss** button — discards the proposal, no state change

Rules:
- Chad never silently edits the plan — every change requires explicit Apply
- Partial proposals (e.g. swap one day) merge with the existing plan rather than replacing the whole week
- Plan modifications only affect the weekly template (`state.plan`) — logged sessions are never modified
- After Apply, Chad follows up: "Done — plan updated. Good luck this week."

---

## Data Model

New localStorage keys:

| Key | Type | Purpose |
|---|---|---|
| `wt_chad_profile` | Object | User stats + active training block |
| `wt_chad_blocks` | Array | Archived past training blocks |
| `wt_chad_pins` | Array of strings | Permanent pinned memories |
| `wt_chad_messages` | Array of `{role, content, timestamp}` | Conversation cache (max 30, 48hr TTL) |

Added to `K` constant:
```js
chadProfile:  'wt_chad_profile',
chadBlocks:   'wt_chad_blocks',
chadPins:     'wt_chad_pins',
chadMessages: 'wt_chad_messages',
```

Added to `state`:
```js
chadProfile:  null,
chadBlocks:   [],
chadPins:     [],
chadMessages: [],
chadOpen:     false,
```

---

## Existing AI Features

- **Post-workout stretches** (`fetchStretches`): unchanged — still triggers after strength sessions
- **Weekly feedback** (`getWeeklyFeedback`): currently orphaned (Week screen removed). Chad absorbs this role — the weekly feedback functionality can be removed or Chad can surface it conversationally on request
- **`ATHLETE_CONTEXT` constant**: deleted and replaced by dynamic system prompt builder
- **`MODEL` constant**: unchanged (`claude-haiku-4-5-20251001`)

---

## Out of Scope

- Backend sync or multi-device access
- Voice input
- Push notifications from Chad
- Chad modifying individual logged sessions
- Chad managing sets/reps targets within the plan (plan stores exercise names only)
