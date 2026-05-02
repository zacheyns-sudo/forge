# Forge Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Forge from a reactive log-after-the-fact app into a RUNNA-inspired plan-driven PWA with a weekly workout template, daily plan view, and bottom-sheet logging flow.

**Architecture:** All changes are confined to the single `index.html` file (CSS + HTML + JS inline). No build tooling is introduced. Tasks are ordered so the app remains functional after each commit — early tasks add empty screen shells that fill in as later tasks execute.

**Tech Stack:** Vanilla JS, CSS custom properties, localStorage, single-file HTML PWA. No frameworks, no build step.

---

## File Map

Only one file changes throughout: `index.html`.

Sections modified per task:
| Task | Section in index.html |
|------|----------------------|
| 1 | CSS `:root` block (lines ~18–45), `<meta theme-color>`, `initTheme()`, `toggleTheme()` |
| 2 | `K`, `state`, `loadState()`, `persist()`, `RUN_TYPES`, `initWIP()` |
| 3 | Bottom nav HTML, `#top-bar` CSS, new `#top-nav` CSS+HTML, body padding, `showTab()` |
| 4 | New `#screen-plan` HTML, Plan screen CSS |
| 5 | `openPicker()`, `addExercise()`, `renderPicker()`, `state` |
| 6 | New `renderPlanScreen()`, `renderPlanDayEditor()`, `savePlanDay()` JS |
| 7 | New `#screen-today` HTML, Today screen CSS |
| 8 | New `renderTodayScreen()`, `renderDayContent()`, `setViewDate()` JS |
| 9 | New `#log-sheet` HTML + CSS |
| 10 | `openLogSheet()`, `closeLogSheet()`, `renderLogForm()`, `saveWorkout()` |
| 11 | `#onboarding` HTML replacement, `maybeShowOnboarding()` → `maybeShowSetup()` |
| 12 | Remove `#screen-log`, `#screen-history`, `#screen-week` HTML + dead CSS, final `showTab()` |

---

## Task 1: Update light-mode colour tokens

**Files:**
- Modify: `index.html` — CSS `:root` block, `<meta>` tag, `initTheme()`, `toggleTheme()`

- [ ] **Step 1: Replace the CSS `:root` block**

Find the `:root {` block (currently starts at ~line 18) and replace its entire contents:

```css
:root {
  /* Light — Sand + Deep Red */
  --bg: #fdf8f0;
  --surface: #fffdf9;
  --surface-2: #f5ede0;
  --surface-3: #ede3d2;
  --border: #e8dece;
  --border-2: #d4c4aa;
  --text: #1c1208;
  --muted: #a0906e;
  --muted-2: #c8b89a;
  --accent: #991b1b;
  --accent-dim: rgba(153, 27, 27, 0.10);
  --red: #b91c1c;
  --amber: #b45309;
  --blue: #1d4ed8;
  --success: #166534;
  --topbar-bg: #fdf8f0;
  --nav-bg: rgba(253, 248, 240, 0.94);
  --bg-fade: rgba(253, 248, 240, 0);
  --err-tint: #fde8e8;
  --backdrop: rgba(0, 0, 0, 0.4);
  --shadow-sheet: 0 -8px 32px rgba(0, 0, 0, 0.1);
  --nav-h: 68px;
  --top-h: 52px;
  --pill-h: 52px;
  --sa-bot: env(safe-area-inset-bottom, 0px);
  --sa-top: env(safe-area-inset-top, 0px);
}
```

- [ ] **Step 2: Update the `<meta name="theme-color">` tag**

Find line 13:
```html
<meta name="theme-color" id="theme-color-meta" content="#f7f3ed">
```
Replace with:
```html
<meta name="theme-color" id="theme-color-meta" content="#fdf8f0">
```

- [ ] **Step 3: Update hardcoded colours in `initTheme()` and `toggleTheme()`**

Find both occurrences of this line (inside `initTheme` and inside `toggleTheme`):
```js
document.getElementById('theme-color-meta').content = dark ? '#131110' : '#f7f3ed';
```
Replace both with:
```js
document.getElementById('theme-color-meta').content = dark ? '#131110' : '#fdf8f0';
```

- [ ] **Step 4: Open app in browser, verify the warm cream is now sand/parchment, accent buttons are deep red**

Open `http://localhost:3000` (or run `node server.js` and visit the port). Background should be warm off-white (#fdf8f0), accent colour on the type buttons should be deep red (#991b1b).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: sand + deep red colour scheme"
```

---

## Task 2: Data model — plan state, onboarding flag, run types

**Files:**
- Modify: `index.html` — `RUN_TYPES`, `K`, `state`, `loadState()`, `persist()`, `initWIP()`

- [ ] **Step 1: Update `RUN_TYPES` constant**

Find line ~1399:
```js
const RUN_TYPES = ['Easy', 'Tempo', 'Intervals', 'Long Run'];
```
Replace with:
```js
const RUN_TYPES = ['Easy Run', 'Hard Run', 'Long Run'];
```

- [ ] **Step 2: Add new keys to the `K` object**

Find the `K` object (~line 1402) and add two entries:
```js
const K = {
  workouts: 'wt_workouts',
  prs: 'wt_prs',
  weekly: 'wt_weekly',
  weight: 'wt_weight',
  key: 'wt_key',
  custom: 'wt_custom_lifts',
  lastType: 'wt_last_type',
  plan: 'wt_plan',
  onboarded: 'wt_onboarded',
};
```

- [ ] **Step 3: Add `plan` and `onboarded` to the `state` object**

Find the `state` object (~line 1416) and add two properties:
```js
const state = {
  workouts: [],
  prs: {},
  weekly: {},
  weight: [],
  key: '',
  custom: [],
  currentType: 'strength',
  viewWeek: null,
  prCat: 'Lifts',
  wip: null,
  plan: {},
  onboarded: false,
  viewDate: null,       // ISO date string for Today screen
  pickerContext: 'log', // 'log' | 'plan'
  planPickerDow: null,  // day-of-week (0–6) when pickerContext === 'plan'
};
```

- [ ] **Step 4: Load `plan` and `onboarded` in `loadState()`**

Find `loadState()` and add two lines after the existing try/catch blocks:
```js
function loadState() {
  try { state.workouts = JSON.parse(localStorage.getItem(K.workouts) || '[]'); } catch { state.workouts = []; }
  try { state.prs = JSON.parse(localStorage.getItem(K.prs) || '{}'); } catch { state.prs = {}; }
  try { state.weekly = JSON.parse(localStorage.getItem(K.weekly) || '{}'); } catch { state.weekly = {}; }
  try { state.weight = JSON.parse(localStorage.getItem(K.weight) || '[]'); } catch { state.weight = []; }
  try { state.custom = JSON.parse(localStorage.getItem(K.custom) || '[]'); } catch { state.custom = []; }
  try { state.plan = JSON.parse(localStorage.getItem(K.plan) || '{}'); } catch { state.plan = {}; }
  state.onboarded = localStorage.getItem(K.onboarded) === '1';
  state.key = localStorage.getItem(K.key) || '';
  state.currentType = localStorage.getItem(K.lastType) || 'strength';
  state.viewWeek = isoWeekKey(new Date());
  state.viewDate = iso();
}
```

- [ ] **Step 5: Persist `plan` in `persist()`**

Find `persist()`. The existing function already iterates `Object.keys(K)` and handles each key. It currently has a special case for `key` and `lastType`. Add `onboarded` to the special-case block:

```js
function persist(keys) {
  (keys || Object.keys(K)).forEach(k => {
    const key = K[k];
    if (!key) return;
    if (k === 'key' || k === 'lastType') localStorage.setItem(key, state[k === 'lastType' ? 'currentType' : 'key'] || '');
    else if (k === 'onboarded') localStorage.setItem(key, state.onboarded ? '1' : '');
    else localStorage.setItem(key, JSON.stringify(state[k] ?? (k === 'prs' || k === 'weekly' ? {} : [])));
  });
}
```

- [ ] **Step 6: Update `initWIP()` default run type**

Find inside `initWIP()`:
```js
if (state.currentType === 'run') Object.assign(base, { distance: '', time: '', rpe: 6, feel: 3, notes: '', runType: 'Easy', hrZone: null });
```
Replace `'Easy'` with `'Easy Run'`:
```js
if (state.currentType === 'run') Object.assign(base, { distance: '', time: '', rpe: 6, feel: 3, notes: '', runType: 'Easy Run', hrZone: null });
```

- [ ] **Step 7: Verify app still loads and logs work correctly**

Open the app. Log a run — the run type buttons should now read "Easy Run", "Hard Run", "Long Run". Save it. Check the History tab still shows the session.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat: add plan/onboarding data model, update run types"
```

---

## Task 3: Navigation — top pill row replacing bottom nav

**Files:**
- Modify: `index.html` — HTML (nav section, body), CSS (bottom nav removed, top nav added, body padding), `showTab()`

- [ ] **Step 1: Remove the bottom nav HTML**

Find and delete these lines (~1263–1268):
```html
<!-- ══ BOTTOM NAV ══════════════════════════════════════════════════════════ -->
<nav id="bottom-nav">
  <button data-tab="log" class="active"><span class="nav-icon">＋</span><span>Log</span></button>
  <button data-tab="history"><span class="nav-icon">≡</span><span>History</span></button>
  <button data-tab="week"><span class="nav-icon">◔</span><span>Week</span></button>
  <button data-tab="prs"><span class="nav-icon">★</span><span>PRs</span></button>
</nav>
```

- [ ] **Step 2: Add `#top-nav` HTML immediately after `</header>` (after the closing tag of `#top-bar`)**

```html
<nav id="top-nav">
  <button data-tab="today" class="active">Today</button>
  <button data-tab="plan">Plan</button>
  <button data-tab="prs">PRs</button>
</nav>
```

- [ ] **Step 3: Add two placeholder screen shells before `#screen-prs`**

Insert these two sections before the `#screen-prs` section:
```html
<!-- ══ TODAY SCREEN ═══════════════════════════════════════════════════════ -->
<section id="screen-today" class="screen active">
  <div id="day-strip-wrap"></div>
  <div id="day-content"></div>
</section>

<!-- ══ PLAN SCREEN ════════════════════════════════════════════════════════ -->
<section id="screen-plan" class="screen">
  <div id="plan-body"></div>
</section>
```

Also change `#screen-log` from `class="screen active"` to `class="screen"` (remove `active`):
```html
<section id="screen-log" class="screen">
```

- [ ] **Step 4: Replace bottom nav CSS with top nav CSS**

Find the `/* ── Bottom nav ──` CSS block (~lines 155–195) and replace the entire block with:

```css
/* ── Top pill nav ────────────────────────────────────────────────────────── */
#top-nav {
  position: fixed;
  top: calc(var(--top-h) + var(--sa-top));
  left: 0;
  right: 0;
  z-index: 39;
  padding: 8px 16px;
  display: flex;
  gap: 6px;
  background: var(--topbar-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
}

#top-nav button {
  flex: 1;
  padding: 7px 0;
  border: none;
  border-radius: 20px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

#top-nav button.active {
  background: var(--accent);
  color: #fff;
}
```

- [ ] **Step 5: Update body padding**

Find in CSS:
```css
body {
  min-height: 100vh;
  min-height: 100dvh;
  padding-top: calc(var(--top-h) + var(--sa-top));
  padding-bottom: calc(var(--nav-h) + var(--sa-bot));
}
```
Replace with:
```css
body {
  min-height: 100vh;
  min-height: 100dvh;
  padding-top: calc(var(--top-h) + var(--sa-top) + var(--pill-h));
  padding-bottom: var(--sa-bot);
}
```

- [ ] **Step 6: Replace `showTab()` and its event wiring**

Find and replace the `showTab` function and the `document.querySelectorAll('#bottom-nav button')` wiring block:

```js
function showTab(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  document.querySelectorAll('#top-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  const titles = { today: 'Today', plan: 'Plan', prs: 'PRs' };
  $('#screen-title').textContent = titles[name] || name;
  if (name === 'today') renderTodayScreen();
  if (name === 'plan') renderPlanScreen();
  if (name === 'prs') renderPRs();
}

document.querySelectorAll('#top-nav button').forEach(b => {
  b.addEventListener('click', () => showTab(b.dataset.tab));
});
```

- [ ] **Step 7: Verify the app loads with the new top pill nav**

Open the app. You should see three pill buttons — Today, Plan, PRs — below the header. Today is active (but shows blank since the screen shell is empty). Tapping PRs should show the PR screen. The old bottom bar should be gone.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat: replace bottom nav with top pill row (Today/Plan/PRs)"
```

---

## Task 4: Plan screen HTML + CSS

**Files:**
- Modify: `index.html` — `#plan-body` content structure, Plan screen CSS

- [ ] **Step 1: Add Plan screen CSS**

Add the following CSS block after the `.week-nav` section (or near the end of the `<style>` block, before `</style>`):

```css
/* ── Plan screen ─────────────────────────────────────────────────────────── */
.plan-dow-strip {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.plan-dow-btn {
  flex: 0 0 auto;
  padding: 7px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.plan-dow-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.plan-type-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.plan-type-btn {
  padding: 10px 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.plan-type-btn.active {
  background: var(--accent-dim);
  color: var(--accent);
  border-color: var(--accent);
}

.plan-ex-list {
  margin-bottom: 12px;
}

.plan-ex-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
}

.plan-ex-item:last-child {
  border-bottom: none;
}

.plan-ex-remove {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}
```

- [ ] **Step 2: Verify CSS is valid**

Open the app, check DevTools console — no CSS errors. Plan tab still shows blank (JS not added yet).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add plan screen CSS"
```

---

## Task 5: Exercise picker dual context

The exercise picker currently always adds to `state.wip.exercises`. It needs to also support adding to `state.plan[dow].exercises` when used from the Plan screen.

**Files:**
- Modify: `index.html` — `openPicker()`, `addExercise()`, `renderPicker()`

- [ ] **Step 1: Update `openPicker()` to accept a context parameter**

Find `openPicker()` and replace it:

```js
function openPicker(context, planDow) {
  state.pickerContext = context || 'log';
  state.planPickerDow = planDow != null ? planDow : null;
  $('#picker-backdrop').classList.add('open');
  $('#picker-sheet').classList.add('open');
  $('#picker-search').value = '';
  renderPicker('');
  setTimeout(() => $('#picker-search').focus(), 250);
}
```

- [ ] **Step 2: Update `addExercise()` to route by context**

Find `addExercise()` and replace it:

```js
function addExercise(name) {
  if (state.pickerContext === 'plan') {
    const dow = state.planPickerDow;
    if (dow == null) return;
    if (!state.plan[dow]) state.plan[dow] = { type: 'strength', exercises: [] };
    if (!state.plan[dow].exercises) state.plan[dow].exercises = [];
    if (!state.plan[dow].exercises.includes(name)) {
      state.plan[dow].exercises.push(name);
      persist(['plan']);
    }
    renderPlanDayEditor(dow);
    return;
  }
  // Default: log context
  if (!LIFT_LIBRARY.includes(name) && !state.custom.includes(name)) {
    state.custom.push(name);
    persist(['custom']);
  }
  state.wip.exercises.push({ name, sets: [{ weight: '', reps: '' }] });
  renderLogForm();
}
```

- [ ] **Step 3: Update the "Add Exercise" button in `renderStrengthForm()` to pass context**

Find inside `renderStrengthForm()`:
```js
<button class="add-exercise-btn" onclick="openPicker()">＋ Add Exercise</button>
```
Replace with:
```js
<button class="add-exercise-btn" onclick="openPicker('log')">＋ Add Exercise</button>
```

- [ ] **Step 4: Verify exercise picker still works in the old log form**

Navigate to History → confirm old strength sessions still show. Then (if screen-log is still accessible) add an exercise — it should still work. No console errors.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: exercise picker dual context (log vs plan)"
```

---

## Task 6: Plan screen JS

**Files:**
- Modify: `index.html` — add `renderPlanScreen()`, `renderPlanDayEditor()`, `savePlanDay()`, `removeExerciseFromPlan()` after the existing `renderHistory()` function

- [ ] **Step 1: Add the Plan screen functions**

Add the following JS block after `renderHistory()` (find `// ═══ HISTORY SCREEN` section end and insert after it):

```js
// ═══════════════════════════════════════════════════════════════════════════
// PLAN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Plan screen tracks selected day-of-week
let planViewDow = 1; // default to Monday

function renderPlanScreen() {
  const el = $('#plan-body');
  if (!el) return;
  el.innerHTML = `
    <h2>Weekly Plan</h2>
    <div class="plan-dow-strip">
      ${DOW_LABELS.map((label, dow) => `
        <button class="plan-dow-btn${planViewDow === dow ? ' active' : ''}"
          onclick="setPlanDow(${dow})">${label}</button>
      `).join('')}
    </div>
    <div id="plan-day-editor"></div>
  `;
  renderPlanDayEditor(planViewDow);
}

window.setPlanDow = function(dow) {
  planViewDow = dow;
  renderPlanScreen();
};

function renderPlanDayEditor(dow) {
  const el = $('#plan-day-editor');
  if (!el) return;
  const day = state.plan[dow] || { type: 'rest' };
  const types = [
    { key: 'strength', label: 'Strength' },
    { key: 'run', label: 'Run' },
    { key: 'rest', label: 'Rest' },
    { key: 'other', label: 'Other' },
  ];

  let detailHtml = '';
  if (day.type === 'strength') {
    const exes = day.exercises || [];
    detailHtml = `
      <div class="card">
        <label>Exercises</label>
        <div class="plan-ex-list">
          ${exes.length
            ? exes.map((name, idx) => `
                <div class="plan-ex-item">
                  <span>${esc(name)}</span>
                  <button class="plan-ex-remove" onclick="removeExerciseFromPlan(${dow}, ${idx})">✕</button>
                </div>`).join('')
            : `<div style="color:var(--muted);font-size:13px;padding:8px 0">No exercises yet.</div>`}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="openPicker('plan', ${dow})" style="width:100%">＋ Add Exercise</button>
      </div>
    `;
  } else if (day.type === 'run') {
    const runType = day.runType || 'Easy Run';
    detailHtml = `
      <div class="card">
        <label>Run Type</label>
        <div class="segmented" style="margin-bottom:14px">
          ${RUN_TYPES.map(t => `<button data-rt="${t}" class="${runType === t ? 'active' : ''}" onclick="savePlanDay(${dow},'runType','${t}')">${t}</button>`).join('')}
        </div>
        <label>Target Distance (km, optional)</label>
        <input type="number" inputmode="decimal" step="0.1" placeholder="e.g. 10"
          value="${esc(day.targetDistance || '')}"
          onchange="savePlanDay(${dow},'targetDistance',this.value ? parseFloat(this.value) : null)">
      </div>
    `;
  } else if (day.type === 'other' || day.type === 'rest') {
    detailHtml = `
      <div class="card">
        <label>Notes (optional)</label>
        <textarea placeholder="Any notes for this day…" onchange="savePlanDay(${dow},'notes',this.value)">${esc(day.notes || '')}</textarea>
      </div>
    `;
  }

  el.innerHTML = `
    <div class="plan-type-row">
      ${types.map(t => `
        <button class="plan-type-btn${day.type === t.key ? ' active' : ''}"
          onclick="savePlanDay(${dow},'type','${t.key}')">${t.label}</button>
      `).join('')}
    </div>
    ${detailHtml}
  `;
}

window.savePlanDay = function(dow, field, value) {
  if (!state.plan[dow]) state.plan[dow] = { type: 'rest' };
  if (field === 'type' && value !== state.plan[dow].type) {
    // Reset day-specific fields when type changes
    state.plan[dow] = { type: value };
    if (value === 'strength') state.plan[dow].exercises = [];
    if (value === 'run') { state.plan[dow].runType = 'Easy Run'; state.plan[dow].targetDistance = null; }
  } else {
    state.plan[dow][field] = value;
  }
  persist(['plan']);
  renderPlanDayEditor(dow);
};

window.removeExerciseFromPlan = function(dow, idx) {
  if (!state.plan[dow] || !state.plan[dow].exercises) return;
  state.plan[dow].exercises.splice(idx, 1);
  persist(['plan']);
  renderPlanDayEditor(dow);
};
```

- [ ] **Step 2: Verify Plan screen renders correctly**

Tap Plan in the nav. You should see "Weekly Plan" heading, a Mon–Sun pill strip, and a day editor showing "Strength / Run / Rest / Other" type buttons. Set a few days — tap a day, select Strength, add exercises. Tap another day, select Run, pick a run type. Reload the page — all settings should persist.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: plan screen — weekly template builder"
```

---

## Task 7: Today screen HTML + CSS

**Files:**
- Modify: `index.html` — `#screen-today` content, Today screen CSS

- [ ] **Step 1: Add Today screen CSS**

Add the following CSS block (after the plan screen CSS or near the end of `<style>`):

```css
/* ── Today screen ────────────────────────────────────────────────────────── */
.day-strip {
  display: flex;
  gap: 0;
  overflow-x: auto;
  margin: 0 -16px 16px;
  padding: 10px 16px 12px;
  scrollbar-width: none;
  border-bottom: 1px solid var(--border);
}

.day-strip::-webkit-scrollbar { display: none; }

.day-cell {
  flex: 0 0 auto;
  width: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  padding: 4px 2px;
  border-radius: 10px;
  -webkit-tap-highlight-color: transparent;
}

.day-cell:active { background: var(--surface-2); }

.day-cell .dc-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.day-cell .dc-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
}

.day-cell.today .dc-label {
  color: var(--accent);
  font-size: 9px;
}

.day-cell.today .dc-num {
  background: var(--accent);
  color: #fff;
}

.day-cell.selected:not(.today) .dc-num {
  background: var(--surface-3);
}

.day-cell .dc-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: transparent;
}

.day-cell .dc-dot.logged { background: var(--accent); }
.day-cell .dc-dot.planned { background: var(--border-2); }

.day-content-area {
  padding: 0 0 24px;
}

.today-workout-name {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}

.today-workout-meta {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 14px;
}

.today-ex-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 18px;
}

.today-ex-chip {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.today-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--muted);
}

.today-empty .big { font-size: 40px; margin-bottom: 8px; }

.today-secondary-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 0;
  text-decoration: underline;
  display: block;
  margin-top: 4px;
}
```

- [ ] **Step 2: Verify CSS loads without errors**

Open app, check DevTools console. Today tab still shows blank. No errors.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: today screen CSS"
```

---

## Task 8: Today screen JS

**Files:**
- Modify: `index.html` — add `renderTodayScreen()`, `renderDayStrip()`, `renderDayContent()`, `setViewDate()` after the Plan screen JS block

- [ ] **Step 1: Add Today screen JS**

Add the following block after the Plan screen JS (after `removeExerciseFromPlan`):

```js
// ═══════════════════════════════════════════════════════════════════════════
// TODAY SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function renderTodayScreen() {
  const stripEl = $('#day-strip-wrap');
  const contentEl = $('#day-content');
  if (!stripEl || !contentEl) return;
  if (!state.viewDate) state.viewDate = iso();

  stripEl.innerHTML = renderDayStrip();
  contentEl.innerHTML = renderDayContent(state.viewDate);

  // Scroll strip so selected day is visible
  const selected = stripEl.querySelector('.day-cell.selected');
  if (selected) selected.scrollIntoView({ inline: 'center', block: 'nearest' });
}

window.setViewDate = function(dateStr) {
  state.viewDate = dateStr;
  renderTodayScreen();
  // Update header title
  const today = iso();
  $('#screen-title').textContent = dateStr === today ? 'Today' : fmtShort(dateStr);
};

function renderDayStrip() {
  const today = iso();
  // Show 14 days back, 7 days forward
  const days = [];
  for (let i = -14; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(iso(d));
  }

  return `<div class="day-strip">${days.map(dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    const isToday = dateStr === today;
    const isSelected = dateStr === state.viewDate;
    const logged = state.workouts.some(w => w.date === dateStr);
    const dow = d.getDay();
    const planned = state.plan[dow] && state.plan[dow].type !== 'rest';
    const dayLabel = isToday ? 'TODAY' : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow];
    const dotClass = logged ? 'logged' : (planned ? 'planned' : '');
    const cellClass = ['day-cell', isToday ? 'today' : '', isSelected ? 'selected' : ''].filter(Boolean).join(' ');
    return `
      <div class="${cellClass}" onclick="setViewDate('${dateStr}')">
        <div class="dc-label">${dayLabel}</div>
        <div class="dc-num">${d.getDate()}</div>
        <div class="dc-dot ${dotClass}"></div>
      </div>
    `;
  }).join('')}</div>`;
}

function renderDayContent(dateStr) {
  const today = iso();
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  const planDay = state.plan[dow];
  const logged = state.workouts.filter(w => w.date === dateStr);
  const isFuture = dateStr > today;
  const isPast = dateStr < today;
  const isToday = dateStr === today;

  // ── Past or today: show logged session if it exists ──────────────────────
  if (logged.length) {
    const w = logged[0];
    return `
      <div class="day-content-area">
        <div class="today-workout-name">${esc(TYPES.find(t => t.key === w.type)?.label || w.type)}</div>
        <div class="today-workout-meta">${fmtDay(dateStr)}</div>
        <div class="card">${renderSessionCard(w)
          .replace('<div class="session"', '<div class="session expanded"')}</div>
        ${isToday ? `<button class="today-secondary-link" onclick="openLogSheet('${dateStr}', false)">+ Log another session</button>` : ''}
      </div>
    `;
  }

  // ── Future day (unlogged): show plan ─────────────────────────────────────
  if (isFuture) {
    if (!planDay || planDay.type === 'rest') {
      return `<div class="today-empty"><div class="big">😴</div><div>Rest day planned</div></div>`;
    }
    return renderPlannedDayView(dateStr, planDay, false);
  }

  // ── Today (unlogged): show plan + Start button ────────────────────────────
  if (isToday) {
    if (!planDay) {
      return `
        <div class="today-empty">
          <div class="big">📋</div>
          <div style="font-weight:700;margin-bottom:8px">No plan set for today</div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:16px">Set up your weekly schedule in the Plan tab.</div>
          <button class="btn" onclick="showTab('plan')">Go to Plan</button>
          <button class="today-secondary-link" onclick="openLogSheet('${dateStr}', false)">Log a workout anyway</button>
        </div>
      `;
    }
    if (planDay.type === 'rest') {
      return `
        <div class="today-empty">
          <div class="big">😴</div>
          <div style="font-weight:700;margin-bottom:8px">Rest day</div>
          <button class="today-secondary-link" onclick="openLogSheet('${dateStr}', false)">Log a workout anyway</button>
        </div>
      `;
    }
    return renderPlannedDayView(dateStr, planDay, true);
  }

  // ── Past day (unlogged) ───────────────────────────────────────────────────
  if (isPast) {
    if (!planDay || planDay.type === 'rest') {
      return `<div class="today-empty"><div class="big">—</div><div style="color:var(--muted)">Nothing planned</div></div>`;
    }
    return `
      <div class="day-content-area">
        ${renderPlannedDayView(dateStr, planDay, false)}
        <p style="color:var(--muted);font-size:13px;text-align:center;margin-top:8px">Not logged</p>
        <button class="today-secondary-link" style="text-align:center" onclick="openLogSheet('${dateStr}', true)">Log it late</button>
      </div>
    `;
  }

  return '';
}

function renderPlannedDayView(dateStr, planDay, showStart) {
  const typeLabel = { strength: 'Strength', run: 'Run', other: 'Other', rest: 'Rest' }[planDay.type] || planDay.type;
  let detailHtml = '';

  if (planDay.type === 'strength') {
    const exes = planDay.exercises || [];
    detailHtml = exes.length
      ? `<div class="today-ex-preview">${exes.map(n => `<span class="today-ex-chip">${esc(n)}</span>`).join('')}</div>`
      : `<p style="color:var(--muted);font-size:13px">No exercises set — tap Start to add them.</p>`;
  } else if (planDay.type === 'run') {
    const runType = planDay.runType || 'Easy Run';
    const dist = planDay.targetDistance ? ` · ${planDay.targetDistance}km target` : '';
    detailHtml = `<div class="today-workout-meta">${esc(runType)}${dist}</div>`;
  }

  const startBtn = showStart
    ? `<button class="btn" onclick="openLogSheet('${dateStr}', true)">Start Workout</button>`
    : '';

  return `
    <div class="day-content-area">
      <div class="today-workout-name">${typeLabel}</div>
      <div class="today-workout-meta">${fmtDay(dateStr)}</div>
      ${detailHtml}
      ${startBtn}
    </div>
  `;
}
```

- [ ] **Step 2: Wire initial render in the INIT block**

Find the INIT block at the bottom of the `<script>` (near `initTheme(); loadState();`) and add `renderTodayScreen()`:

```js
initTheme();
loadState();
renderTypeSelector();
renderLogForm();
renderTodayScreen();
maybeShowOnboarding();
```

- [ ] **Step 3: Verify Today screen works**

Open the app on the Today tab. You should see the day strip with ~21 days. The current day should be circled in accent red. Tapping any past day should show "Not logged" or a logged session. Tapping a future day should show the plan or rest. No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: today screen — day strip + day content"
```

---

## Task 9: Log sheet HTML + CSS

**Files:**
- Modify: `index.html` — add `#log-sheet` HTML and CSS

- [ ] **Step 1: Add log sheet HTML**

Find the `<!-- Exercise picker -->` comment (~line 1323) and insert the log sheet just before it:

```html
<!-- ══ LOG SHEET ═════════════════════════════════════════════════════════ -->
<div id="log-backdrop" class="sheet-backdrop"></div>
<div id="log-sheet" class="sheet">
  <div class="sheet-handle"></div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <h3 id="log-sheet-title" style="margin:0">Log Workout</h3>
    <button class="icon-btn" onclick="closeLogSheet()" aria-label="Close">✕</button>
  </div>
  <div id="sheet-type-selector" style="display:none"></div>
  <div id="sheet-form"></div>
</div>
```

- [ ] **Step 2: Verify HTML is valid**

Open the app — no console errors. The sheet is hidden by default (uses existing `.sheet` CSS which starts off-screen).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: log sheet HTML structure"
```

---

## Task 10: Log sheet JS — open, close, pre-populate from plan

**Files:**
- Modify: `index.html` — add `openLogSheet()`, `closeLogSheet()`, update `renderLogForm()` to accept a target element, update `saveWorkout()`

- [ ] **Step 1: Update `renderLogForm()` to accept an optional target element**

Find `renderLogForm()`:
```js
function renderLogForm() {
  if (!state.wip || state.wip.type !== state.currentType) state.wip = initWIP();
  const t = state.currentType;
  const el = $('#log-form');
  if (t === 'strength') el.innerHTML = renderStrengthForm();
  else if (t === 'run') el.innerHTML = renderRunForm();
  else if (t === 'rest') el.innerHTML = renderRestForm();
  else el.innerHTML = renderGenericForm();
  wireFormHandlers();
}
```

Replace with:
```js
function renderLogForm(targetEl) {
  if (!state.wip || state.wip.type !== state.currentType) state.wip = initWIP();
  const t = state.currentType;
  const el = targetEl || $('#log-form');
  if (!el) return;
  if (t === 'strength') el.innerHTML = renderStrengthForm();
  else if (t === 'run') el.innerHTML = renderRunForm();
  else if (t === 'rest') el.innerHTML = renderRestForm();
  else el.innerHTML = renderGenericForm();
  wireFormHandlers();
}
```

- [ ] **Step 2: Add `openLogSheet()` and `closeLogSheet()`**

Add these functions after `renderTodayScreen()` (or near `openPicker()`):

```js
function openLogSheet(dateStr, fromPlan) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  const planDay = state.plan[dow];

  if (fromPlan && planDay && planDay.type !== 'rest') {
    // Pre-populate wip from the plan template
    state.currentType = planDay.type;
    state.wip = initWIP();
    state.wip.date = dateStr;
    state.wip.timestamp = new Date(dateStr + 'T00:00:00').getTime();
    if (planDay.type === 'strength' && planDay.exercises && planDay.exercises.length) {
      state.wip.exercises = planDay.exercises.map(name => ({
        name,
        sets: [{ weight: '', reps: '' }],
      }));
    }
    if (planDay.type === 'run' && planDay.runType) {
      state.wip.runType = planDay.runType;
    }
    $('#sheet-type-selector').style.display = 'none';
    $('#log-sheet-title').textContent = fmtShort(dateStr);
  } else {
    // Unplanned: show type selector first
    state.currentType = 'strength';
    state.wip = initWIP();
    state.wip.date = dateStr;
    state.wip.timestamp = new Date(dateStr + 'T00:00:00').getTime();
    const sel = $('#sheet-type-selector');
    sel.style.display = 'block';
    sel.innerHTML = TYPES.filter(t => t.key !== 'rest').map(t => `
      <button class="type-btn${state.currentType === t.key ? ' active' : ''}" onclick="setSheetType('${t.key}')">
        <span class="type-icon">${t.icon}</span>
        <span class="type-label">${t.label}</span>
      </button>
    `).join('');
    $('#log-sheet-title').textContent = 'Log Workout';
  }

  renderLogForm($('#sheet-form'));
  $('#log-backdrop').classList.add('open');
  $('#log-sheet').classList.add('open');
}

window.setSheetType = function(type) {
  state.currentType = type;
  state.wip = initWIP();
  state.wip.date = state.viewDate || iso();
  const sel = $('#sheet-type-selector');
  if (sel) {
    sel.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.textContent.trim().toLowerCase().startsWith(type)));
  }
  renderLogForm($('#sheet-form'));
};

function closeLogSheet() {
  $('#log-backdrop').classList.remove('open');
  $('#log-sheet').classList.remove('open');
  state.wip = null;
  renderTodayScreen();
  // Restore Today header
  const today = iso();
  $('#screen-title').textContent = (state.viewDate === today) ? 'Today' : fmtShort(state.viewDate);
}

$('#log-backdrop').addEventListener('click', closeLogSheet);
```

- [ ] **Step 3: Update `saveWorkout()` to close the sheet and refresh Today**

Find inside `saveWorkout()` at the end, after `persist(['workouts'])`:

```js
      if (newPRs.length) toast(`🏆 New PR: ${newPRs.map(p => p.name).join(', ')}`, { long: true });
      else toast('Session saved.');

      if (w.type === 'strength') fetchStretches(w);

      // Reset WIP and go to history
      state.wip = null;
      renderLogForm();
      setTimeout(() => showTab('history'), 400);
```

Replace that final block with:

```js
      if (newPRs.length) toast(`🏆 New PR: ${newPRs.map(p => p.name).join(', ')}`, { long: true });
      else toast('Session saved.');

      if (w.type === 'strength') fetchStretches(w);

      state.wip = null;
      if ($('#log-sheet').classList.contains('open')) {
        closeLogSheet();
      } else {
        renderLogForm();
        setTimeout(() => showTab('today'), 400);
      }
```

- [ ] **Step 4: Verify the full logging flow**

1. Open Today tab — tap a day with a planned strength workout, tap "Start Workout". The log sheet should slide up pre-populated with those exercises.
2. Fill in some weights and reps. Tap "Save Session". Sheet should dismiss, day dot should fill in, session summary should appear.
3. Tap a rest day — tap "Log a workout anyway". Sheet should open with the type selector. Pick Run, fill in distance/time. Save. Dot fills in.
4. Check that tapping a logged past day shows the session summary.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: log sheet — pre-populate from plan, open/close flow"
```

---

## Task 11: First-run setup — repurpose onboarding

The current `#onboarding` is an API key entry overlay. Replace it with a week-setup wizard shown on first launch.

**Files:**
- Modify: `index.html` — `#onboarding` HTML, `#onboarding` CSS, `maybeShowOnboarding()`, bottom of INIT block

- [ ] **Step 1: Replace `#onboarding` HTML**

Find:
```html
<div id="onboarding" class="overlay hidden">
  <div class="overlay-panel">
    <div class="logo">🔥</div>
    <h3>Forge</h3>
    <p>Workout tracker for lifting, running, and everything in between.</p>
    <label for="onboard-key">Anthropic API Key</label>
    <input type="password" id="onboard-key" placeholder="sk-ant-...">
    <div class="spacer-md"></div>
    <button class="btn" id="onboard-save">Start Training</button>
    <div class="spacer-sm"></div>
    <button class="btn btn-ghost" id="onboard-skip">Skip for now</button>
    <div class="spacer-sm"></div>
    <p class="text-sm" style="margin:6px 0 0">Stored only on this device. AI features need it; logging works without.
    </p>
  </div>
</div>
```

Replace with:
```html
<div id="onboarding" class="overlay hidden">
  <div class="overlay-panel" style="max-width:400px">
    <div id="setup-welcome" class="">
      <div class="logo" style="font-size:36px;text-align:center;margin-bottom:8px">🔥</div>
      <h3 style="text-align:center;margin-bottom:8px">Welcome to Forge</h3>
      <p style="text-align:center;color:var(--muted);margin-bottom:24px">Let's set up your training week. You can always change this later in Plan.</p>
      <button class="btn" id="setup-start">Get Started</button>
      <div class="spacer-sm"></div>
      <button class="btn btn-ghost" id="setup-skip">Skip for now</button>
    </div>
    <div id="setup-step" class="hidden">
      <div style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px" id="setup-step-label">Monday</div>
      <h3 style="margin:0 0 16px" id="setup-step-day">What are you doing on Monday?</h3>
      <div class="plan-type-row" id="setup-type-row"></div>
      <div id="setup-detail"></div>
      <div class="spacer-md"></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" id="setup-prev" style="flex:0 0 auto;width:44px">‹</button>
        <button class="btn" id="setup-next" style="flex:1">Next →</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Replace `maybeShowOnboarding()` and its event listeners**

Find the onboarding JS block:
```js
// Onboarding
function maybeShowOnboarding() {
  if (state.key) return;
  $('#onboarding').classList.remove('hidden');
}
$('#onboard-save').addEventListener('click', () => { ... });
$('#onboard-skip').addEventListener('click', () => $('#onboarding').classList.add('hidden'));
```

Replace entirely with:

```js
// ── First-run setup ─────────────────────────────────────────────────────────
const SETUP_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun
const SETUP_DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
let setupIdx = 0; // index into SETUP_DAYS

function maybeShowOnboarding() {
  if (state.onboarded) return;
  $('#onboarding').classList.remove('hidden');
}

function finishSetup() {
  state.onboarded = true;
  persist(['onboarded', 'plan']);
  $('#onboarding').classList.add('hidden');
  renderTodayScreen();
  renderPlanScreen();
}

$('#setup-start').addEventListener('click', () => {
  $('#setup-welcome').classList.add('hidden');
  $('#setup-step').classList.remove('hidden');
  setupIdx = 0;
  renderSetupStep();
});

$('#setup-skip').addEventListener('click', finishSetup);

$('#setup-next').addEventListener('click', () => {
  setupIdx++;
  if (setupIdx >= SETUP_DAYS.length) {
    finishSetup();
  } else {
    renderSetupStep();
  }
});

$('#setup-prev').addEventListener('click', () => {
  if (setupIdx > 0) { setupIdx--; renderSetupStep(); }
});

function renderSetupStep() {
  const dow = SETUP_DAYS[setupIdx];
  const dayName = SETUP_DAY_NAMES[setupIdx];
  const day = state.plan[dow] || { type: 'rest' };

  $('#setup-step-label').textContent = `Day ${setupIdx + 1} of 7`;
  $('#setup-step-day').textContent = dayName;
  $('#setup-prev').disabled = setupIdx === 0;
  $('#setup-next').textContent = setupIdx === SETUP_DAYS.length - 1 ? "Let's Train →" : 'Next →';

  const types = [
    { key: 'strength', label: 'Strength' },
    { key: 'run', label: 'Run' },
    { key: 'rest', label: 'Rest' },
    { key: 'other', label: 'Other' },
  ];

  $('#setup-type-row').innerHTML = types.map(t => `
    <button class="plan-type-btn${day.type === t.key ? ' active' : ''}"
      onclick="setSetupType(${dow}, '${t.key}')">${t.label}</button>
  `).join('');

  renderSetupDetail(dow, day);
}

window.setSetupType = function(dow, type) {
  if (!state.plan[dow] || state.plan[dow].type !== type) {
    state.plan[dow] = { type };
    if (type === 'strength') state.plan[dow].exercises = [];
    if (type === 'run') { state.plan[dow].runType = 'Easy Run'; }
  }
  renderSetupStep();
};

function renderSetupDetail(dow, day) {
  const el = $('#setup-detail');
  if (day.type === 'strength') {
    const exes = day.exercises || [];
    el.innerHTML = `
      <div class="card" style="margin-top:12px">
        <label>Exercises (optional)</label>
        <div class="plan-ex-list" id="setup-ex-list">
          ${exes.map((name, idx) => `
            <div class="plan-ex-item">
              <span>${esc(name)}</span>
              <button class="plan-ex-remove" onclick="removeSetupEx(${dow},${idx})">✕</button>
            </div>`).join('')}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="openPicker('plan',${dow})" style="width:100%;margin-top:4px">＋ Add Exercise</button>
      </div>
    `;
  } else if (day.type === 'run') {
    el.innerHTML = `
      <div class="card" style="margin-top:12px">
        <label>Run Type</label>
        <div class="segmented">
          ${RUN_TYPES.map(t => `<button class="${(day.runType||'Easy Run')===t?'active':''}" onclick="setSetupRunType(${dow},'${t}')">${t}</button>`).join('')}
        </div>
      </div>
    `;
  } else {
    el.innerHTML = '';
  }
}

window.removeSetupEx = function(dow, idx) {
  if (state.plan[dow] && state.plan[dow].exercises) {
    state.plan[dow].exercises.splice(idx, 1);
    renderSetupStep();
  }
};

window.setSetupRunType = function(dow, runType) {
  if (!state.plan[dow]) state.plan[dow] = { type: 'run' };
  state.plan[dow].runType = runType;
  renderSetupStep();
};
```

- [ ] **Step 3: Verify the first-run setup flow**

Open the app in an incognito window (so `wt_onboarded` is not set). The setup overlay should appear. Click "Get Started", step through Mon–Sun setting workout types and adding exercises. Click "Let's Train →" on Sunday. App should land on Today with the plan saved. Reload — no setup overlay should show again.

Also test "Skip for now" — should dismiss and never show again.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: first-run setup — week planning wizard"
```

---

## Task 12: Final wire-up and cleanup

Remove the dead screens (Log, History, Week) from the HTML, remove their CSS, and ensure everything is fully wired.

**Files:**
- Modify: `index.html` — remove `#screen-log`, `#screen-history`, `#screen-week` HTML and their CSS

- [ ] **Step 1: Remove the three dead screen HTML sections**

Delete these HTML sections entirely:
```html
<!-- ══ LOG SCREEN ══════════════════════════════════════════════════════════ -->
<section id="screen-log" class="screen">
  <div class="type-selector" id="type-selector"></div>
  <div id="log-form"></div>
</section>

<!-- ══ HISTORY SCREEN ══════════════════════════════════════════════════════ -->
<section id="screen-history" class="screen">
  <h2>History</h2>
  <div id="history-list"></div>
</section>

<!-- ══ WEEK SCREEN ═════════════════════════════════════════════════════════ -->
<section id="screen-week" class="screen">
  <div class="week-nav">
    <button id="week-prev" aria-label="Previous week">◂</button>
    <div style="text-align:center">
      <div class="week-label" id="week-label">This Week</div>
      <div class="week-range" id="week-range"></div>
    </div>
    <button id="week-next" aria-label="Next week">▸</button>
  </div>
  <div id="week-body"></div>
</section>
```

- [ ] **Step 2: Remove the dead CSS blocks**

Remove these CSS blocks:
- `.week-nav { ... }` block
- `.week-label { ... }`, `.week-range { ... }` 
- `.stats-grid { ... }` block and its nested `.stats-grid .card`
- `.type-selector { ... }` and `.type-btn { ... }` blocks (the log screen type buttons)

- [ ] **Step 3: Update the INIT block — remove `renderTypeSelector()` and `renderLogForm()` calls**

Find:
```js
initTheme();
loadState();
renderTypeSelector();
renderLogForm();
renderTodayScreen();
maybeShowOnboarding();
```

Replace with:
```js
initTheme();
loadState();
renderTodayScreen();
renderPlanScreen();
maybeShowOnboarding();
```

- [ ] **Step 4: Verify the full app end-to-end**

Run through the full flow:
1. Clear localStorage (`localStorage.clear()` in DevTools console), reload — first-run setup appears
2. Complete setup (assign types + exercises to each day)
3. Today tab: day strip visible, today circled, plan shown for today
4. Tap "Start Workout" → sheet slides up pre-populated → fill in reps/weights → Save → dot fills in → summary shown
5. Navigate to a past day → session summary or "Not logged" shown
6. Plan tab: weekly grid, change a day's type and exercises → persists on reload
7. PRs tab: personal records visible, tapping a PR works
8. Dark mode toggle: works correctly with new sand/red colours
9. Settings overlay: API key field still accessible
10. No console errors anywhere

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: remove legacy screens, wire Today as default — redesign complete"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Top pill nav (Today · Plan · PRs) — Task 3
- ✅ Sand + Deep Red colour scheme — Task 1
- ✅ Day strip with scrollable row, status dots — Task 8
- ✅ Day content states (today planned/logged, past logged/unlogged, future, rest) — Task 8
- ✅ Bottom sheet logging, pre-populated from plan template — Task 10
- ✅ Template is editable before saving — inherent in the sheet (exercises can be added/removed)
- ✅ Run types: Easy Run / Hard Run / Long Run — Task 2
- ✅ Plan screen: Mon–Sun grid, direct day editor — Task 6
- ✅ Unplanned workout path ("Log anyway" / "Log something different") — Task 10
- ✅ Header shows date when not today, "Today" when on today — Tasks 8 + 10
- ✅ First-run setup wizard — Task 11
- ✅ Onboarding skip → lands on Today — Task 11
- ✅ PRs screen unchanged — never touched
- ✅ History accessible by navigating days in Today strip — Task 8
- ✅ `wt_plan`, `wt_onboarded` localStorage keys — Task 2
- ✅ Layout token changes (--nav-h removed from body padding) — Task 3
- ✅ Dark mode toggle preserved — never removed

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete.

**Type consistency:**
- `state.plan[dow]` used consistently as `{ type, exercises?, runType?, targetDistance?, notes? }`
- `openPicker('plan', dow)` signature matches `openPicker(context, planDow)` definition
- `renderLogForm(targetEl)` optional param consistent across all callers
- `renderPlanDayEditor(dow)` called identically from `renderPlanScreen`, `savePlanDay`, `addExercise`
