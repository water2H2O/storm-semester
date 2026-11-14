# Storm Semester · 学期风暴

> **See your workload before it becomes a storm. Know what to start next.**
> 
> *把学期截止转化为浮空城市上空的天气预报。提前洞察学业积压，专注当下第一步。*

[![BUHACK 2.0](https://img.shields.io/badge/BUHACK%202.0-EdTech%20Track-blue)](#)
[![Zero Dependency](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Static)-brightgreen)](#)
[![Local First](https://img.shields.io/badge/Storage-localStorage-orange)](#)

---

## 💡 Quick Demo (在线/本地演示)

Open `index.html` in any modern web browser. **Zero build steps, zero node dependencies, zero server configuration.**

- 🌟 **Recommended Demo Date (最佳暴雨体验)**: Open **`index.html?today=2026-11-13`**
  - Pins calculation to November 13, 2026 (the peak storm date with 5 major deadlines, Black Rainstorm warning).
  - Normal view (without query param) uses your system's current date.
- 🎬 **Demo video**: `demo/storm-semester-demo.mp4` (96 s, 1080p, English captions burned in). Re-record with `node scripts/record-demo.mjs`.
- 🌏 **Language**: English by default. Switch to 繁體中文 / 简体中文 from the segmented control in the top-right corner, or force one with `?lang=en|zh-Hant|zh-Hans`. The choice is remembered in `localStorage`.

### Guided Walkthrough (30-second tour)
1. **The 3D Skyline**: Observe the cloud/fog/rain and window illumination reflecting the semester workload.
2. **Slide Up Details**: Swipe or click `View semester details ↑` to access the full forecast.
3. **Actionable Priority (`Do this next`)**: See the single highest-priority task recommended by the dynamic preparation curve.
4. **Complete & Clear**: Click `Mark complete` on submission items. Watch the view smoothly return to the 3D city as skies clear and warnings drop!
5. **Interactive Tweaks**: Adjust task weights or preparation windows (`Wt` / `Win`), or import `.ics` files from Moodle / Google Calendar.
6. **Try another language**: The whole interface — including the sample semester — re-renders in English, Traditional Chinese or Simplified Chinese.

---

## 🎯 The Problem & Vision

Traditional calendars and to-do lists have clear blind spots when handling academic crunches:
1. **Calendars** tell you *when* something is due, but not *how heavy* the cumulative workload is leading up to it.
2. **To-Do lists** treat everything as checkable, ignoring preparation-heavy events like exams, presentations, or in-class assessments.
3. **Neither tool answers**: *"Among all my upcoming deadlines, what exactly should I start working on right now?"*

**Storm Semester introduces a transparent, interpretable workload layer:**
- **Today's Weather (`今日天气`)**: Aggregates pressure from all upcoming deadlines using type-specific anticipation curves.
- **Next Storm Warning (`下一场风暴`)**: Flags upcoming critical clusters (T3 / T8 / Black Rainstorm) within the next 30 days.
- **Start Here (`现在做这一件`)**: Recommends the single item requiring immediate focus based on preparation windows, not just final deadline dates.
- **Submission vs. Preparation (`提交型 vs 发生型`)**: Differentiates between checkable assignments and exam preparation checklists.

---

## 🧮 Workload Engine & Curve Model

The workload metric is calculated deterministically:

$$\text{Workload}(day) = \sum_{e \in \text{Unfinished}} \text{Weight}(e) \times \text{Factor}(e, day)$$

- **Due Date Factor**: Evaluates to **1.3** on the exact due date.
- **Preparation Window**: Scales progressively from **0.0 to 0.85** across the lead window according to event type curves.
- **Post-Deadline / Outside Window**: Evaluates to **0.0** (past events do not pile up artificially).

| Type (`类型`) | Category | Default Weight | Window (`准备窗口`) | Anticipation Curve (`曲线模型`) |
|---|---|:---:|:---:|---|
| **Lab** (实验报告) | Submit | 2.0 | 7 days | Steady linear slope (`平稳`) |
| **Presentation** (汇报) | Submit | 3.0 | 5 days | Stepped ramp (`台阶`) |
| **Interview** (随堂抽查) | Happen | 3.0 | 3 days | Late surge (`陡升`) |
| **Quiz** (小测) | Happen | 3.0 | 5 days | Late surge (`陡升`) |
| **Exam** (期末/期中考) | Happen | 4.0 | 10 days | Long gradual ramp (`长坡`) |

Weather states map progressively:
`Clear (晴)` $\rightarrow$ `Cloudy (多云)` $\rightarrow$ `Overcast (阴)` $\rightarrow$ `Rain (小雨)` $\rightarrow$ `Thunderstorm (雷暴)` $\rightarrow$ `Typhoon T3 (三号风球)` $\rightarrow$ `Typhoon T8 (八号风球)` $\rightarrow$ `Black Rainstorm (黑色暴雨)`.

> *Disclaimer: This model is a transparent workload planning heuristic, not a medical or psychological diagnosis tool, nor an official meteorological alert from the Hong Kong Observatory.*

---

## 🏗️ Architecture

```text
       Calendar Input (.ics) / Form Input
                       ↓
       importer.js  →  store.js (localStorage)
                           ↓
                      engine.js (Workload & Priority Math)
                           ↓
                        app.js (UI Coordination & Routing)
                      ↙        ↘
           HTML/CSS Dashboard    scene3d.js (Three.js WebGL)
                                      ↓
                         cities/ (generic.js / hongkong.js)
```
    i18n.js (en / zh-Hant / zh-Hans) ──► injects labels into engine + UI + seed data

- **`engine.js`**: Core math for workload curves, priority ranking, next-storm forecast, and date utilities. Fully headless — display labels are injected by `i18n.js` through `setLabels()`, so the maths never depends on a language.
- **`store.js`**: Browser `localStorage` abstraction, seed dataset loading, event CRUD, and checklist persistence. Seed titles and checklists ship in all three languages.
- **`i18n.js`**: Flat key-value dictionaries for English, Traditional Chinese and Simplified Chinese, with interpolation, plural forms, `?lang=` deep links and a persisted switcher.
- **`importer.js`**: Client-side `.ics` RFC 5545 parser.
- **`scene3d.js`**: Three.js WebGL environment: procedural clouds, dynamic rain particle systems, lightning flashes, responsive camera rigs.
- **`cities/`**: Pluggable procedural city models without external heavy 3D assets:
  - `hongkong.js`: Victoria Harbour, IFC/BOC inspired towers, Star Ferry, and observatory signals.
  - `generic.js`: Floating island low-poly baseline.
- **`app.js`**: Application controller, gesture bindings, HUD synchronization, and toast feedback. Every user-facing string goes through `StormI18N.t()`.

---

## 🧪 Engine Verification

A headless test script verifies the mathematical logic without a browser:

```sh
node scripts/verify.mjs
```

Runs assertions covering:
- Seed dataset integrity & uniqueness
- Multi-deadline weather score calculations & Black Rainstorm triggers
- Post-completion pressure drop validation
- Comparison of early ramp-up characteristics across event curves
- Actionable priority sorting & future storm discovery
- Horizon confidence thresholds (14-day cutoff)

---

## 📦 Data & Limitations

- Event state lives in this browser's `localStorage`; there is no account or sync. Clearing site data resets it, and the language choice is stored the same way.
- Calculations are day-based even when an event carries a time; overdue events stop contributing rather than carrying forward.
- Imported `.ics` data is parsed locally. Complex recurring rules and exotic timezones should be checked against the original calendar.
- The animated city needs WebGL; performance varies by device.
- Translations are maintained by hand in `i18n.js`. Traditional Chinese uses Hong Kong wording (匯入, 事項, 準備窗口); any missing key falls back to English rather than showing a raw key.

---

## ⚖️ License & Provenance

- **Three.js**: Bundled Three.js (r160) is distributed under the [MIT License](https://github.com/mrdoob/three.js/blob/r160/LICENSE).
- **Prior Exploration**: The procedural floating-island concept builds upon pre-hackathon personal WebGL prototyping by the author. Refactored, modularized, and tailored for BUHACK 2.0.
- **Target Event**: Built for **BUHACK 2.0 (Hong Kong Baptist University Coding Club)**. Submissions close **15 November 2026, 10:00 HKT**.
