# Chad AI Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Chad — a persistent AI training assistant — to Forge as a floating bottom-sheet chat with multi-turn conversation, a user profile replacing the hardcoded `ATHLETE_CONTEXT`, two-tier memory (pinned + 48hr cache), and inline plan proposal cards the user can accept with one tap.

**Architecture:** All code is in `index.html` (single-file PWA). Chad is a new bottom sheet alongside the existing log/picker sheets, wired to the Anthropic API via the existing `callClaudeJSON` pattern. A new multi-turn `callChadAPI()` function sends the full message history. Profile and memory live in four new localStorage keys.

**Tech Stack:** Vanilla JS, CSS custom properties, localStorage, Anthropic Messages API (claude-haiku-4-5-20251001). No new dependencies.

**Working directory:** `/Users/zacheyns/forge/.worktrees/chad-ai-coach`

---

## File Map

Only `index.html` changes throughout.

| Task | Section |
|------|---------|
| 1 | `K`, `state`, `loadState()`, `persist()` |
| 2 | `<style>` block — new Chad CSS |
| 3 | HTML body — floating button + sheet structure |
| 4 | JS — `buildAthleteContext()`, `buildChadSystemPrompt()`, `callChadAPI()`, `openChad()`, `closeChad()`, `renderChadSheet()`, `renderChadMessages()`, `renderChadPins()`, window helpers, INIT block |
| 5 | JS — `sendChadMessage()`, loading state, error handling |
| 6 | JS — first-open setup flow: `chadStartSetup()`, `chadHandleSetupResponse()` |
| 7 | JS — `renderChadPlanCard()`, `window.applyChadPlan()` |
| 8 | JS — delete `ATHLETE_CONTEXT`, update `fetchStretches` + `getWeeklyFeedback`, update CLAUDE.md |

---

## Task 1: Data model — Chad K keys, state, loadState, persist

**Files:**
- Modify: `index.html` — `K` object, `state` object, `loadState()`, `persist()`

- [ ] **Step 1: Add four keys to the `K` object**

Find `const K = {` (currently ends with `onboarded: 'wt_onboarded',`). Add four entries:

```js
const K = {
  workouts:     'wt_workouts',
  prs:          'wt_prs',
  weekly:       'wt_weekly',
  weight:       'wt_weight',
  key:          'wt_key',
  custom:       'wt_custom_lifts',
  lastType:     'wt_last_type',
  plan:         'wt_plan',
  onboarded:    'wt_onboarded',
  chadProfile:  'wt_chad_profile',
  chadBlocks:   'wt_chad_blocks',
  chadPins:     'wt_chad_pins',
  chadMessages: 'wt_chad_messages',
};
```

- [ ] **Step 2: Add Chad properties to `state`**

Find `const state = {` and add after `planPickerDow: null,`:

```js
  chadProfile:  null,   // { goal, blockEnd, blockStart, heightWeight, age, fitnessLevel }
  chadBlocks:   [],     // archived past training blocks
  chadPins:     [],     // permanent pinned memories (strings)
  chadMessages: [],     // { role, content, timestamp, planProposal?, applied? }
  chadOpen:     false,
```

- [ ] **Step 3: Load Chad keys in `loadState()`**

Find `loadState()` and add four lines after the existing try/catch blocks:

```js
  try { state.chadProfile  = JSON.parse(localStorage.getItem(K.chadProfile)  || 'null'); } catch { state.chadProfile = null; }
  try { state.chadBlocks   = JSON.parse(localStorage.getItem(K.chadBlocks)   || '[]');  } catch { state.chadBlocks = []; }
  try { state.chadPins     = JSON.parse(localStorage.getItem(K.chadPins)     || '[]');  } catch { state.chadPins = []; }
  try { state.chadMessages = JSON.parse(localStorage.getItem(K.chadMessages) || '[]');  } catch { state.chadMessages = []; }
```

- [ ] **Step 4: Persist Chad keys in `persist()`**

The existing `persist()` falls through to `JSON.stringify` for unknown keys. Since `chadProfile` can be `null`, add a special case. Find the `persist()` function and update the `else` branch:

```js
function persist(keys) {
  (keys || Object.keys(K)).forEach(k => {
    const key = K[k];
    if (!key) return;
    if (k === 'key' || k === 'lastType') localStorage.setItem(key, state[k === 'lastType' ? 'currentType' : 'key'] || '');
    else if (k === 'onboarded') localStorage.setItem(key, state.onboarded ? '1' : '');
    else if (k === 'chadProfile') localStorage.setItem(key, JSON.stringify(state.chadProfile ?? null));
    else localStorage.setItem(key, JSON.stringify(state[k] ?? (k === 'prs' || k === 'weekly' || k === 'plan' ? {} : [])));
  });
}
```

- [ ] **Step 5: Verify app loads without errors**

Open `http://localhost:3000`. DevTools console should show no errors. The app should behave identically to before — no Chad UI yet.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: Chad data model — K keys, state, loadState, persist"
```

---

## Task 2: Chad CSS

**Files:**
- Modify: `index.html` — `<style>` block, add all Chad CSS near the end before `</style>`

- [ ] **Step 1: Add Chad CSS block**

Find `</style>` and insert the following block immediately before it:

```css
/* ── Chad floating button ───────────────────────────────────────────────── */
#chad-btn {
  position: fixed;
  bottom: calc(24px + var(--sa-bot));
  right: 16px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(153, 27, 27, 0.35);
  cursor: pointer;
  transition: transform 0.12s;
}
#chad-btn:active { transform: scale(0.96); }

/* ── Chad sheet overrides ───────────────────────────────────────────────── */
#chad-sheet {
  display: flex;
  flex-direction: column;
  height: 90dvh;
  max-height: 90dvh;
}

.chad-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.chad-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.chad-block-chip {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

/* ── Messages ───────────────────────────────────────────────────────────── */
.chad-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 8px;
}
.chad-msg {
  max-width: 82%;
  padding: 10px 13px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.45;
  word-break: break-word;
}
.chad-msg-chad {
  background: var(--surface-2);
  color: var(--text);
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}
.chad-msg-user {
  background: var(--accent);
  color: #fff;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}
.chad-msg-loading {
  background: var(--surface-2);
  align-self: flex-start;
  padding: 12px 16px;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
}

/* ── Plan proposal card ─────────────────────────────────────────────────── */
.chad-plan-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  align-self: flex-start;
  width: 100%;
  max-width: 100%;
}
.chad-plan-card p {
  font-size: 13px;
  margin: 0 0 10px;
  line-height: 1.4;
}
.chad-plan-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 12px;
}
.chad-plan-day { text-align: center; }
.cpd-label {
  font-size: 9px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .03em;
}
.cpd-type {
  margin-top: 3px;
  padding: 4px 2px;
  border-radius: 6px;
  background: var(--surface-2);
  font-size: 9px;
  font-weight: 700;
  color: var(--muted);
}
.cpd-type.strength { background: var(--accent-dim); color: var(--accent); }
.cpd-type.run      { background: rgba(29,78,216,0.10); color: #1d4ed8; }
.cpd-type.proposed { outline: 2px solid var(--accent); outline-offset: 1px; }
.chad-plan-actions { display: flex; gap: 8px; }
.chad-plan-applied { font-size: 12px; font-weight: 700; color: var(--success); }

/* ── Pin strip ──────────────────────────────────────────────────────────── */
.chad-pins-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
  flex-shrink: 0;
}
.chad-pins-strip:empty { display: none; }
.chad-pin-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 8px 3px 10px;
  font-size: 11px;
  color: var(--muted);
  max-width: 180px;
}
.chad-pin-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chad-pin-chip button {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
  padding: 0 2px;
  flex-shrink: 0;
  line-height: 1;
}

/* ── Input row ──────────────────────────────────────────────────────────── */
.chad-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 8px;
  flex-shrink: 0;
}
.chad-input-row input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
}
.chad-pin-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.4;
  padding: 0 2px;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.chad-pin-btn.active { opacity: 1; }
```

- [ ] **Step 2: Verify no CSS errors**

Open the app, check DevTools console — no CSS errors. No visual change yet (Chad elements not in HTML).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: Chad CSS — button, sheet, messages, plan card, pin strip"
```

---

## Task 3: Chad HTML

**Files:**
- Modify: `index.html` — add floating button and sheet HTML before `</body>`

- [ ] **Step 1: Add Chad HTML**

Find `<!-- ══ LOG SHEET` comment. Insert the Chad HTML just before it:

```html
<!-- ══ CHAD FLOATING BUTTON ═════════════════════════════════════════════ -->
<button id="chad-btn" onclick="openChad()" aria-label="Open Chad AI coach">
  💬 Chad
</button>

<!-- ══ CHAD SHEET ════════════════════════════════════════════════════════ -->
<div id="chad-backdrop" class="sheet-backdrop"></div>
<div id="chad-sheet" class="sheet">
  <div class="sheet-handle"></div>
  <div class="chad-header">
    <div>
      <div class="chad-title">Chad</div>
      <div id="chad-block-chip" class="chad-block-chip"></div>
    </div>
    <button class="icon-btn" onclick="closeChad()" aria-label="Close">✕</button>
  </div>
  <div id="chad-messages" class="chad-messages"></div>
  <div id="chad-pins-strip" class="chad-pins-strip"></div>
  <div class="chad-input-row">
    <button id="chad-pin-toggle" class="chad-pin-btn" onclick="toggleChadPin()" title="Pin this message" aria-label="Pin next message">📌</button>
    <input id="chad-input" type="text" placeholder="Ask Chad…" autocomplete="off"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chadSend();}">
    <button class="btn btn-sm" onclick="chadSend()">Send</button>
  </div>
</div>
```

- [ ] **Step 2: Verify the button appears in the UI**

Open the app. A red "💬 Chad" button should appear at the bottom-right of every tab. Tapping it should do nothing yet (no JS). No console errors.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: Chad HTML — floating button and sheet structure"
```

---

## Task 4: Chad core JS — open/close, render, system prompt, pin management

**Files:**
- Modify: `index.html` — add Chad JS block after the Today screen JS section, before the `// ═══ PLAN SCREEN` section; update INIT block

- [ ] **Step 1: Add the full Chad core JS block**

Find the comment `// ═══════════════════════════════════════════════════════════════════════════` before `// PLAN SCREEN` and insert the following block before it:

```js
// ═══════════════════════════════════════════════════════════════════════════
// CHAD AI COACH
// ═══════════════════════════════════════════════════════════════════════════

// ── Context builders ────────────────────────────────────────────────────────

function buildAthleteContext() {
  const p = state.chadProfile;
  if (!p || !p.goal) return 'You are a sports performance coach for an athlete using Forge workout tracker.';
  const daysLeft = p.blockEnd
    ? Math.max(0, Math.round((new Date(p.blockEnd) - new Date()) / 86400000))
    : null;
  let ctx = `You are a sports performance coach.
Athlete profile:
- Goal: ${p.goal}
- Training block: ${p.blockStart || 'started recently'} → ${p.blockEnd || 'no end date'}${daysLeft !== null ? ` (${daysLeft} days remaining)` : ''}
- Age / stats: ${p.heightWeight || 'not provided'}
- Fitness level: ${p.fitnessLevel || 'not provided'}`;
  if (state.chadPins.length) {
    ctx += `\n\nImportant notes to remember:\n${state.chadPins.map(pin => `- ${pin}`).join('\n')}`;
  }
  return ctx;
}

function buildChadSystemPrompt() {
  return `${buildAthleteContext()}

You are Chad, the athlete's personal online training assistant inside the Forge workout tracking app.
Be direct, practical, and motivating. Reference their actual workouts and plan when relevant.

Always respond with valid JSON in exactly one of these two shapes — no markdown, no preamble, no trailing text:

{"type":"message","content":"your response here"}

{"type":"plan_proposal","content":"explanation of the change and why","days":{"1":{"type":"strength","exercises":["Squat","RDL"]},"3":{"type":"rest"}}}

For plan_proposal: days keys are day-of-week integers (0=Sunday … 6=Saturday). Only include days being changed. For strength days, exercises array is optional. For run days include runType: "Easy Run" | "Hard Run" | "Long Run". For rest/other, just include type.`;
}

// ── API ─────────────────────────────────────────────────────────────────────

async function callChadAPI(maxTokens = 1500) {
  if (!state.key) throw new Error('No API key set — add it in Settings (⚙ top right).');
  const messages = state.chadMessages.slice(-30).map(m => ({
    role: m.role,
    content: m.content,
  }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': state.key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: buildChadSystemPrompt(),
      messages,
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ── Sheet open / close ───────────────────────────────────────────────────────

function openChad() {
  // Clear 48hr old conversation cache
  if (state.chadMessages.length) {
    const last = state.chadMessages[state.chadMessages.length - 1];
    if (Date.now() - last.timestamp > 48 * 60 * 60 * 1000) {
      state.chadMessages = [];
      persist(['chadMessages']);
    }
  }

  renderChadSheet();
  $('#chad-backdrop').classList.add('open');
  $('#chad-sheet').classList.add('open');
  state.chadOpen = true;

  // Scroll to bottom
  const msgs = $('#chad-messages');
  if (msgs) setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);

  // First open: start profile setup
  if (!state.chadProfile) {
    chadStartSetup();
  }

  setTimeout(() => $('#chad-input')?.focus(), 300);
}

function closeChad() {
  $('#chad-backdrop').classList.remove('open');
  $('#chad-sheet').classList.remove('open');
  state.chadOpen = false;
}

$('#chad-backdrop').addEventListener('click', closeChad);

// ── Render ───────────────────────────────────────────────────────────────────

function renderChadSheet() {
  const p = state.chadProfile;
  const chip = $('#chad-block-chip');
  if (chip) {
    if (p && p.goal) {
      const daysLeft = p.blockEnd
        ? Math.max(0, Math.round((new Date(p.blockEnd) - new Date()) / 86400000))
        : null;
      chip.textContent = p.goal + (daysLeft !== null ? ` · ${daysLeft}d left` : '');
    } else {
      chip.textContent = '';
    }
  }
  renderChadMessages();
  renderChadPins();
}

function renderChadMessages() {
  const el = $('#chad-messages');
  if (!el) return;
  if (!state.chadMessages.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:13px;text-align:center;padding:32px 0">
      Ask Chad anything about your training.
    </div>`;
    return;
  }
  el.innerHTML = state.chadMessages.map(m => {
    if (m.role === 'user') {
      return `<div class="chad-msg chad-msg-user">${esc(m.content)}</div>`;
    }
    if (m.planProposal) {
      return renderChadPlanCard(m);
    }
    return `<div class="chad-msg chad-msg-chad">${esc(m.content)}</div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function renderChadPins() {
  const el = $('#chad-pins-strip');
  if (!el) return;
  if (!state.chadPins.length) { el.innerHTML = ''; return; }
  el.innerHTML = state.chadPins.map((pin, idx) => `
    <div class="chad-pin-chip">
      <span>${esc(pin.length > 38 ? pin.slice(0, 35) + '…' : pin)}</span>
      <button onclick="deleteChadPin(${idx})" aria-label="Remove pin">✕</button>
    </div>
  `).join('');
}

// ── Pin management ───────────────────────────────────────────────────────────

window.toggleChadPin = function() {
  $('#chad-pin-toggle').classList.toggle('active');
};

window.deleteChadPin = function(idx) {
  state.chadPins.splice(idx, 1);
  persist(['chadPins']);
  renderChadPins();
};

window.chadSend = function() {
  const input = $('#chad-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  sendChadMessage(text);
};
```

- [ ] **Step 2: Wire Chad into INIT block**

Find the INIT block:
```js
initTheme();
loadState();
renderTodayScreen();
renderPlanScreen();
maybeShowOnboarding();
```

No change needed — Chad opens lazily (only renders when the button is tapped). No INIT call required.

- [ ] **Step 3: Verify Chad button opens/closes the sheet**

Open the app. Tap "💬 Chad" — the sheet should slide up (empty messages area with placeholder text). Tap ✕ or the backdrop — sheet closes. No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: Chad core — open/close, render, system prompt, pin management"
```

---

## Task 5: Send message + multi-turn API

**Files:**
- Modify: `index.html` — add `sendChadMessage()` after the Chad core JS block

- [ ] **Step 1: Add `sendChadMessage()`**

Add the following function immediately after `window.chadSend`:

```js
// ── Send / receive ───────────────────────────────────────────────────────────

async function sendChadMessage(text) {
  if (!text.trim()) return;

  // During setup flow, route differently
  if (typeof chadSetupStep === 'number' && chadSetupStep >= 0 && chadSetupStep < CHAD_SETUP_STEPS.length) {
    chadHandleSetupResponse(text);
    return;
  }

  const isPinned = $('#chad-pin-toggle').classList.contains('active');

  // Save user message
  const userMsg = { role: 'user', content: text, timestamp: Date.now() };
  state.chadMessages.push(userMsg);

  // Pin it if toggle is active
  if (isPinned) {
    state.chadPins.push(text);
    persist(['chadPins']);
    $('#chad-pin-toggle').classList.remove('active');
    renderChadPins();
  }

  persist(['chadMessages']);
  renderChadMessages();

  // Add loading bubble
  const msgs = $('#chad-messages');
  const loadingEl = document.createElement('div');
  loadingEl.className = 'chad-msg chad-msg-loading';
  loadingEl.innerHTML = '<div class="spinner"></div>';
  if (msgs) { msgs.appendChild(loadingEl); msgs.scrollTop = msgs.scrollHeight; }

  try {
    const raw = await callChadAPI();
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
    } catch {
      parsed = { type: 'message', content: raw };
    }

    loadingEl.remove();

    const assistantMsg = {
      role: 'assistant',
      content: parsed.content || '',
      timestamp: Date.now(),
    };
    if (parsed.type === 'plan_proposal' && parsed.days && typeof parsed.days === 'object') {
      assistantMsg.planProposal = parsed.days;
    }

    state.chadMessages.push(assistantMsg);
    persist(['chadMessages']);
    renderChadMessages();
  } catch (err) {
    loadingEl.remove();
    state.chadMessages.push({ role: 'assistant', content: `Error: ${esc(err.message)}`, timestamp: Date.now() });
    persist(['chadMessages']);
    renderChadMessages();
  }
}
```

- [ ] **Step 2: Verify basic chat works (requires API key in Settings)**

Open Chad. If you have an API key set in Settings, type a message and send. You should see:
- Your message appears right-aligned in accent red
- A loading spinner appears
- Chad's response appears left-aligned in a grey bubble
- Both sides persist on reload

If no API key is set, you should see an error message bubble: "Error: No API key set — add it in Settings (⚙ top right)."

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: Chad send/receive — multi-turn API, loading state, error handling"
```

---

## Task 6: First-open setup flow

**Files:**
- Modify: `index.html` — add setup constants and functions after `sendChadMessage()`

- [ ] **Step 1: Add setup flow JS**

Add the following immediately after `sendChadMessage()`:

```js
// ── First-open profile setup ─────────────────────────────────────────────────

const CHAD_SETUP_STEPS = [
  { field: 'goal',        q: "What's your main training goal right now? e.g. Get shredded, Run a half marathon, Build muscle" },
  { field: 'blockEnd',    q: "When do you want to hit that goal? Give me a rough date (e.g. July 2026, 12 weeks time)" },
  { field: 'heightWeight',q: "What's your age, height and weight? e.g. 20 years old, 6'3\", 85kg" },
  { field: 'fitnessLevel',q: "Last one — how would you describe your current fitness level? Beginner, intermediate, or advanced?" },
];

let chadSetupStep = -1; // -1 = not in setup

function chadStartSetup() {
  chadSetupStep = 0;
  state.chadProfile = {};
  const greeting = {
    role: 'assistant',
    content: `Hi, I'm Chad — your personal online training assistant. Before we get started, let me learn a bit about you.\n\n${CHAD_SETUP_STEPS[0].q}`,
    timestamp: Date.now(),
  };
  state.chadMessages = [greeting];
  persist(['chadMessages']);
  renderChadMessages();
}

function chadHandleSetupResponse(text) {
  const step = CHAD_SETUP_STEPS[chadSetupStep];

  // Save user message
  state.chadMessages.push({ role: 'user', content: text, timestamp: Date.now() });

  // Save the field value
  state.chadProfile[step.field] = text;
  chadSetupStep++;

  let chadReply;
  if (chadSetupStep < CHAD_SETUP_STEPS.length) {
    // Ask next question
    chadReply = CHAD_SETUP_STEPS[chadSetupStep].q;
  } else {
    // Setup complete
    state.chadProfile.blockStart = iso();
    chadSetupStep = -1;
    persist(['chadProfile']);
    chadReply = `Perfect — I've got everything I need. Let's get to work. Your goal is "${state.chadProfile.goal}" and we've got ${state.chadProfile.blockEnd} to get there. Ask me anything about your training, or say "update my plan" and I'll build you a weekly schedule.`;
    // Update block chip
    const chip = $('#chad-block-chip');
    if (chip && state.chadProfile.goal) chip.textContent = state.chadProfile.goal;
  }

  state.chadMessages.push({ role: 'assistant', content: chadReply, timestamp: Date.now() });
  persist(['chadMessages']);
  renderChadMessages();
}
```

- [ ] **Step 2: Verify first-open setup flow**

Clear localStorage in DevTools (`localStorage.clear()`) then reload. Open Chad — you should see Chad's greeting and first question. Answer each question. After the fourth answer, Chad should give the completion message. The block chip in the header should show your goal.

Reload the page and open Chad again — the messages should still be there and no setup should restart (since `state.chadProfile` is now set).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: Chad first-open setup — conversational profile collection"
```

---

## Task 7: Plan proposal rendering + apply

**Files:**
- Modify: `index.html` — add `renderChadPlanCard()` and `window.applyChadPlan()` after the setup flow

- [ ] **Step 1: Add plan card rendering and apply**

Add the following after `chadHandleSetupResponse()`:

```js
// ── Plan proposals ───────────────────────────────────────────────────────────

function renderChadPlanCard(m) {
  const days = m.planProposal; // e.g. { "1": {type:'strength', exercises:[...]}, "3": {type:'rest'} }
  const DOW_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const TYPE_ABBR = { strength: 'Str', run: 'Run', rest: 'Rest', other: 'Othr' };

  const grid = [1, 2, 3, 4, 5, 6, 0].map(dow => {
    const existing = state.plan[dow] || { type: 'rest' };
    const proposed = days[String(dow)] || days[dow];
    const d = proposed || existing;
    const isProposed = !!proposed;
    return `<div class="chad-plan-day">
      <div class="cpd-label">${DOW_ABBR[dow]}</div>
      <div class="cpd-type ${d.type}${isProposed ? ' proposed' : ''}">${TYPE_ABBR[d.type] || d.type}</div>
    </div>`;
  }).join('');

  const encoded = encodeURIComponent(JSON.stringify(days));
  const actions = m.applied
    ? `<div class="chad-plan-applied">✓ Applied</div>`
    : `<div class="chad-plan-actions">
        <button class="btn btn-sm" onclick="applyChadPlan('${encoded}')">Apply Plan</button>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.chad-plan-card').style.opacity='0.4';this.parentElement.innerHTML='<span style=\\'font-size:12px;color:var(--muted)\\'>Dismissed</span>'">Dismiss</button>
      </div>`;

  return `<div class="chad-plan-card">
    <p>${esc(m.content)}</p>
    <div class="chad-plan-grid">${grid}</div>
    ${actions}
  </div>`;
}

window.applyChadPlan = function(encoded) {
  try {
    const days = JSON.parse(decodeURIComponent(encoded));
    // Merge proposed days into existing plan
    Object.keys(days).forEach(dow => {
      state.plan[dow] = days[dow];
    });
    persist(['plan']);

    // Mark this message as applied so re-renders show ✓ Applied
    const msgIdx = state.chadMessages.findIndex(m =>
      m.planProposal && JSON.stringify(m.planProposal) === JSON.stringify(days)
    );
    if (msgIdx >= 0) {
      state.chadMessages[msgIdx].applied = true;
      persist(['chadMessages']);
    }

    // Follow-up from Chad
    state.chadMessages.push({
      role: 'assistant',
      content: "Done — plan updated. Good luck this week! 💪",
      timestamp: Date.now(),
    });
    persist(['chadMessages']);
    renderChadMessages();
    renderPlanScreen();
    renderTodayScreen();
  } catch {
    toast('Failed to apply plan');
  }
};
```

- [ ] **Step 2: Verify plan proposals render correctly**

With an API key set, open Chad and ask: "Can you update my plan? I want strength on Monday, Wednesday, Friday and an easy run on Saturday. Rest on other days."

Chad should respond with a `plan_proposal` type message — you should see a day grid card with Mon/Wed/Fri showing "Str" (highlighted), Sat showing "Run", others "Rest". Tap "Apply Plan" — the Plan and Today screens should update, and the card should show "✓ Applied". Open the Plan tab to confirm.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: Chad plan proposals — day grid card, Apply/Dismiss"
```

---

## Task 8: Remove ATHLETE_CONTEXT, update fetchStretches and getWeeklyFeedback

**Files:**
- Modify: `index.html` — delete `ATHLETE_CONTEXT` constant, update `fetchStretches` and `getWeeklyFeedback` system prompts, update CLAUDE.md

- [ ] **Step 1: Delete `ATHLETE_CONTEXT`**

Find and delete this line (around line 850):
```js
const ATHLETE_CONTEXT = `You are a sports performance coach for a 20-year-old male athlete, 6'3" tall, training for a sub-1:30 half marathon while building general strength. His goals are: (1) run a sub-1:30 half marathon, (2) build functional strength. All recommendations must be specific to his context — never generic. Reference the actual exercises, loads, distances, and paces he logs. Consider how his strength work supports his running and vice versa.`;
```

- [ ] **Step 2: Update `fetchStretches` system prompt**

Find inside `fetchStretches()`:
```js
  const system = `${ATHLETE_CONTEXT}

You recommend post-session stretches.
```

Replace the first line with `buildAthleteContext()`:
```js
  const system = `${buildAthleteContext()}

You recommend post-session stretches.
```

- [ ] **Step 3: Update `getWeeklyFeedback` system prompt (if it exists)**

Search the file for `getWeeklyFeedback`. If found, find its system prompt line:
```js
  const system = `${ATHLETE_CONTEXT}
```
Replace with:
```js
  const system = `${buildAthleteContext()}
```

If `getWeeklyFeedback` is not called from anywhere active, no change needed beyond the system prompt line.

- [ ] **Step 4: Verify no remaining ATHLETE_CONTEXT references**

Run:
```bash
grep -n "ATHLETE_CONTEXT" index.html
```
Expected: no output.

- [ ] **Step 5: Update CLAUDE.md — AI coach section**

Find in `CLAUDE.md`:
```
### AI coach

Uses the Anthropic API (Claude Haiku, `MODEL` constant) with a hardcoded `ATHLETE_CONTEXT` describing the user. The API key is stored in `state.key` / `localStorage`. Features that call the API: post-session stretches (`fetchStretches`). All AI calls are optional — the app works fully without a key.
```

Replace with:
```
### AI coach — Chad

Chad is a persistent AI training assistant (floating bottom-sheet chat). Key functions:
- `openChad()` / `closeChad()` — open/close the sheet
- `buildAthleteContext()` — builds the athlete profile string from `state.chadProfile` + `state.chadPins`
- `buildChadSystemPrompt()` — full system prompt for Chad, instructs JSON-only responses
- `callChadAPI()` — multi-turn Anthropic API call using `state.chadMessages` as history
- `sendChadMessage(text)` — adds user message, calls API, handles plan proposals
- `chadStartSetup()` / `chadHandleSetupResponse()` — first-open conversational profile collection
- `renderChadPlanCard(m)` / `window.applyChadPlan(encoded)` — plan proposal cards in chat

`state.chadProfile` replaces the old hardcoded `ATHLETE_CONTEXT`. `fetchStretches` uses `buildAthleteContext()` for its system prompt. All AI calls are optional — the app works fully without a key.
```

- [ ] **Step 6: Verify the app still works end-to-end**

1. Open the app. No console errors.
2. Log a strength session. The stretch sheet should still appear after saving.
3. Open Chad. If profile is set, send a message — response should arrive. If no profile, setup flow should start.
4. Ask Chad to update the plan. Apply a proposal — Plan and Today tabs should reflect it.

- [ ] **Step 7: Commit**

```bash
git add index.html CLAUDE.md
git commit -m "feat: replace ATHLETE_CONTEXT with dynamic buildAthleteContext, update docs"
```

---

## Self-Review

**Spec coverage:**
- ✅ Floating Chad button bottom-right on every tab — Task 3
- ✅ Full bottom sheet, same animation pattern as log sheet — Task 3
- ✅ Header with block chip showing goal + days remaining — Task 4
- ✅ Message thread: user right (accent), Chad left (surface-2) — Tasks 4 + 5
- ✅ Plan proposal card: day grid, Apply/Dismiss — Task 7
- ✅ Apply writes to `state.plan`, re-renders Plan + Today — Task 7
- ✅ Pin strip above input, collapsible, delete per pin — Task 4
- ✅ 📌 toggle pins next message — Tasks 4 + 5
- ✅ 48hr conversation cache clear on open — Task 4
- ✅ Max 30 messages sent to API — Task 4 (`callChadAPI` slices to -30)
- ✅ First-open profile setup (goal, blockEnd, heightWeight, fitnessLevel) — Task 6
- ✅ Profile replaces `ATHLETE_CONTEXT` — Task 8
- ✅ `state.chadProfile`, `state.chadBlocks`, `state.chadPins`, `state.chadMessages` in localStorage — Task 1
- ✅ Plan modifications weekly-template only, no logged sessions — Task 7 (merges into `state.plan` only)
- ✅ Post-workout stretches still work — Task 8

**Placeholder scan:** No TBDs. All code blocks complete with actual values.

**Type consistency:**
- `state.chadMessages` items: `{ role, content, timestamp, planProposal?, applied? }` — consistent across Task 4 (render), Task 5 (send), Task 6 (setup), Task 7 (apply)
- `state.chadProfile` fields: `{ goal, blockEnd, blockStart, heightWeight, fitnessLevel }` — consistent between Task 6 (write) and Task 4 `buildAthleteContext()` (read)
- `planProposal` object: `{ "dow": { type, exercises?, runType? } }` string keys — `renderChadPlanCard` reads both `days[String(dow)]` and `days[dow]` to handle either format
- `callChadAPI()` defined in Task 4, called in Task 5 `sendChadMessage()` — consistent
- `chadStartSetup()` and `chadHandleSetupResponse()` defined in Task 6, called from Task 4 `openChad()` and Task 5 `sendChadMessage()` — forward references, JS hoisting doesn't apply to `function` declarations in blocks, but these are function declarations so they hoist. ✅
- `renderChadPlanCard()` defined in Task 7, called from Task 4 `renderChadMessages()` — same forward reference concern. Since it's a `function` declaration it hoists. ✅
