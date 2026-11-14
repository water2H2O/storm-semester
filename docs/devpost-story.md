## Inspiration

I looked at my own November calendar: **19 academic deadlines across 5 courses, crammed into 8 days, with 5 of them landing on the same Friday.** Plus a midterm, an in-class interview and a presentation — the things that have no "submit" button.

Every tool I had failed in a specific way:

| Tool | Blind spot |
|---|---|
| Calendar | Tells me *when*, never *how heavy* |
| To-do list | Only holds things I can tick off; exams and interviews don't exist to it |
| Everything | Never answers *"what should I start right now?"* |

The real feeling wasn't "I have 19 tasks." It was **"this is collapsing and I don't know which wall to shore up first."**

Hong Kong gave me the metaphor. Typhoon signals T3, T8 and the black rainstorm warning are announced on the television, everybody knows what they mean, and nobody panics — you just know what to do. An academic workload works the same way, if you can see the forecast.

## What it does

**Storm Semester turns a semester's deadlines into a weather forecast over a floating 3D city.**

- **Today's weather** — every day gets a state from Clear through Thunderstorm, T3, T8, up to Black Rainstorm, computed from the unfinished work pressing on it.
- **Next storm** — the first high-load day within 30 days. Even on a clear day you know where the weather is heading.
- **Do this next** — exactly one task, never a list. It is ranked by *"the day I should have started"* (deadline minus preparation window), not by weight.
- **Two kinds of events** — *submission* items (labs, reports, presentations) get ticked off; *happen-type* items (exams, in-class interviews, quizzes) have no completion action, only a preparation checklist, because checking a box never made an exam disappear.

The demo data is my real, anonymised semester. **2026-11-13 scores 20.7 — Black Rainstorm — with 5 deadlines due that day.** Tick all five off and the same day drops to 1.2, Overcast. The city clears as the work disappears.

## How I built it

The whole thing is a **static site with zero build step and zero dependencies** — open `index.html` and it runs. Committed incrementally over the hackathon:

| Time | Commit | What it added |
|---|---|---|
| 18:45 | `chore: project scaffold…` | Repo, README, anonymised semester dataset |
| 18:50 | `feat: weather UI with pressure engine…` | Pressure engine, next-storm forecast, priority ranking |
| 18:56 | `feat: 3D floating-island backdrop…` | Three.js scene, weather-driven lighting, fog, rain, lightning |
| 19:12 | `feat: city-first view with slide-up data panel` | The city becomes the app; data slides up over it |
| 19:38 | `feat: split engine/store/cities; type curves…` | Modular rewrite: four curves, event CRUD, weight/window sliders, city switching, lit windows |
| 19:59 | `feat: local activities + .ics import…` | RFC 5545 calendar import, harbour ship, clickable 3D bubbles |
| 22:26 | `feat: Hong Kong city model` | Victoria Harbour, towers, Star Ferry, observatory signal mast |
| 22:35 | `feat: TV-style weather warning badge` | The broadcast-style warning bug in the corner |

**The model.** Each unfinished event contributes a weighted, time-scaled factor:

```
pressure(day) = Σ unfinished events: weight × factor(days-to-due)
```

- On the due date the factor is **1.3**
- Inside the preparation window it rises from **0 to 0.85** along the event's curve
- Outside the window, or past the deadline, it is **0**

Four curves make different work feel different:

| Curve | Type | Default weight | Window |
|---|---|---|---|
| Steady | Lab / assignment | 2 | 7 days |
| Stepped | Presentation | 3 | 5 days |
| Late rise | In-class interview, quiz | 3 | 3–5 days |
| Long ramp | Exam | 4 | 10 days |

A 10-day exam window darkens early November; a lab does not. Pressures map to eight weather levels, with the top three borrowing the Hong Kong Observatory's T3, T8 and Black Rainstorm signals.

**Architecture.** Five files, each with one job:

- `engine.js` — pure maths: curves, scoring, weather bands, priority ordering. Runs headless under Node.
- `store.js` — `localStorage` state, seed dataset, event CRUD, checklist persistence.
- `scene3d.js` — Three.js r160 (bundled, MIT) rendering: sky, fog, rain particles, lightning, camera.
- `cities/` — pluggable city modules behind a tiny registry, so a new city is one file.
- `app.js` — the interface and the wiring between state and scene.

Everything is procedural geometry — **no models, no textures, no network requests**. Terrain uses batched voxels to keep draw calls down. Weather presets drive sun intensity, fog colour and range, rain density, flash rate and exposure, so the city *is* the readout.

**Verification and delivery.** `scripts/verify.mjs` asserts the engine without a browser: dataset integrity, the black-rainstorm day, the post-completion drop, curve ordering (9 days of exposure matters more for an exam than a quiz), priority ordering, next-storm discovery, and the 14-day confidence cutoff. The demo video is captured by a script that drives OBS over its WebSocket API and the browser over the DevTools protocol — captions are injected into the page and recorded, so no editing step is needed.

## Challenges I ran into

**Modelling something honest.** The obvious failure mode for an "academic stress app" is pretending to measure mental health. I kept the heuristic fully visible: a formula, four curves, adjustable weights. The tool forecasts *workload*, not wellbeing — and it says so in the README and on screen.

**Exams break the to-do metaphor.** A calendar holds an exam as one date; a to-do list can't hold it at all. Splitting events into *submission* and *happen* types was the design unlock — it also forced the UI to stop showing a "Mark complete" button where completion is meaningless.

**Making the 3D city earn its place.** A rain effect is decoration; a rain effect that *is* the data is the product. The city had to be readable at a glance and tied to the score, or it was a screensaver.

**The demo date problem.** The app defaults to the real current date. By the day after the hackathon, my stormiest day would already be past and the demo would open on a mild, empty week. Pinning the date with `?today=2026-11-13` made the walkthrough reproducible.

**Background selection.** The whole product was one four-hour sprint, and the last two commits were visual polish (Hong Kong model, TV badge) that could easily have eaten the budget. Freezing features to make room for the README, tests and video turned out to matter more than one more building.

## Accomplishments that I'm proud of

- A working complete loop: enter events → see the forecast → get one task → finish it → **watch the city physically clear**.
- The 11/13 drop from Black Rainstorm (20.7) to Overcast (1.2) — the score, the scene and the narrative all agree.
- Two interaction models for two kinds of academic work, instead of pretending everything is a checkbox.
- A real, anonymised dataset rather than invented demo numbers.
- A pluggable city interface that produced a Hong Kong model with its own signal mast in one evening.
- Interface in English, Traditional Chinese and Simplified Chinese, with the maths completely language-independent — labels are injected into the engine, never baked into it.

## What I learned

**Dates are not workload.** Two deadlines on the same day can cost wildly different amounts of preparation, and that difference is where the stress actually lives.

**A metaphor is only useful if it leads to an action.** The weather is what makes the problem legible; "do this next" is what makes it bearable. Without the second half, the first half is just anxiety with nicer graphics.

**A visible heuristic is more trustworthy than a confident one.** Showing the curves and letting people drag the weights made testers trust the number more, not less.

**Scope is the real technical skill.** Four hours of feature work and four hours of README, tests and video produced something far more defensible than eight hours of features.

## What's next for Storm Semester

- **Validate it with real students.** Ask 5–10 people to run it against their own semester and watch where the suggested task disagrees with their gut. That disagreement is the interesting data.
- **Make the review cycle real.** Completion is currently the only feedback signal; I want to learn whether suggested tasks are actually started, and adjust the curves from that.
- **Surface preparation.** Checklists currently live only on the focus card, so on a storm day they're easy to miss. Every event should expose its checklist from the list.
- **Import properly.** `.ics` covers Moodle and Google Calendar, but recurring rules and timezones need hardening before I'd trust a real export.
- **Deploy and measure.** Get it online, watch whether people come back on a second day, and only then think about accounts or sync.

**Try it:** open `index.html?today=2026-11-13` — no build, no install, no account.
