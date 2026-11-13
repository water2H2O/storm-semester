# Storm Semester

**Your semester has weather. Nobody forecasts it.**

A weather-forecast interface for academic deadlines. Instead of a calendar that only tells you *when*, Storm Semester tells you *how bad* each day is — and when the next storm lands.

**Theme: EdTech** — a study tool that helps students see, plan for, and survive deadline pressure.

---

## The problem

A real Hong Kong undergraduate November:

- 19 events packed into 8 days
- 5 deadlines landing on a single Friday
- Plus an in-class interview, a midterm exam, and a presentation — none of which have a "submit" button, so a to-do list ignores them entirely

Existing tools have three blind spots:

| Tool | Blind spot |
|---|---|
| Calendar | tells you *when*, not *how heavy* |
| To-do list | only tracks things you can tick off; exams and interviews vanish |
| All of them | never answer **"which one do I touch first?"** |

The real feeling is not "I have 19 tasks". It is "everything is collapsing and I don't know which piece to save first."

---

## What it does

**1. Today's weather** — each day gets a weather state derived from the deadlines pressing on it.

| Pressure | Weather | Signal |
|---|---|---|
| 0 | clear | — |
| 0.01 – 2 | cloudy | — |
| 2 – 4 | overcast | — |
| 4 – 7 | light rain | — |
| 7 – 10 | thunderstorm | — |
| 10 – 13 | Signal No. 3 | T3 |
| 13 – 18 | Signal No. 8 | T8 |
| > 18 | black rainstorm | BLACK |

**2. Next storm** — the first heavy day in the next 30 days. Even on a clear day, you see where the weather turns.

**3. What to do first** — one thing, not a list. Ranked by *"you should already have started"* (due date minus the preparation window), not by weight.

**4. Two kinds of events**

| | `submit` | `happen` |
|---|---|---|
| Examples | lab, report, presentation | exam, in-class interview, quiz |
| Completion | tick it off | none — only **preparedness** |
| Ends by | you tick it | time passes |

An exam cannot be submitted, but you can watch your readiness climb from 0% to 100%.

---

## Event types and their pressure curves

| Type | kind | weight | window | curve |
|---|---|---|---|---|
| `lab` | submit | 2 | 7 days | steady |
| `per` | submit | 3 | 5 days | stepped |
| `interview` | happen | 3 | 3 days | steep |
| `quiz` | happen | 3 | 5 days | steep |
| `exam` | happen | 4 | 10 days | long ramp |

The curve decides **when the weather starts turning**. A 10-day exam window makes early November look overcast; a lab does not.

---

## Pressure model

```
P(day) = Σ over unfinished events: weight × shape(daysUntilDue, leadDays, curve)
```

- on the due day: factor 1.0
- before it: ramps 0 → 0.85 along the curve
- after it: zero

Today's exam always beats next week's exam. That asymmetry is the whole point.

---

## Run it

```bash
node scripts/report.mjs
```

Prints the November weather table, today's forecast, and the priority ranking.

---

## Data

`data/semester.json` — 19 events across 5 courses, anonymized. Real calendar, real pressure.

---

<sub>Built during BUHACK 2.0 (Nov 13–15, 2026), HKBU Coding Club.</sub>
