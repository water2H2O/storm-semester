# BUHACK 2.0 submission draft

Track: **EdTech**  
Deadline: **15 November 2026, 10:00 HKT (UTC+8)**

Copy the sections below into Devpost after checking them against the final build. Add the deployed URL, public repository URL, and video URL in the submission form. Use `?today=2026-11-13&lang=en` on the demo URL for a reproducible storm-day walkthrough.

## Project name

Storm Semester

## Tagline

See your workload before it becomes a storm. Know what to start next.

## Inspiration

The idea came from an actual student schedule: 19 academic events across five courses in November, with five deadlines landing on the same Friday. A calendar could show all of those dates, but it was harder to see how the preparation work would accumulate before them—or decide what to start today.

We wanted to make that build-up visible. In Hong Kong, weather warnings are a familiar way to understand what is coming and prepare for it. Storm Semester borrows that visual language for academic planning.

## What it does

Storm Semester turns unfinished academic events into a weather forecast above an interactive 3D city. Students can see today's workload, spot the next high-load day, and get one suggested task to start.

Different event types have different preparation windows and curves. Exams and quizzes use preparation checklists rather than a misleading “submit” button. Submission tasks can be marked complete, and the city responds as their contribution disappears from the forecast.

Students can add, edit, and delete events, adjust weights and preparation windows, import an `.ics` calendar, switch between a generic island and a Hong Kong city, and change the interface language on the fly. Data stays in the browser's local storage.

## How we built it

The app is a static site built with HTML, CSS, JavaScript, and Three.js. It requires no build system or backend.

A separate engine calculates daily workload from event weights and type-specific preparation curves. The interface passes the resulting weather state to a modular 3D scene that controls lighting, fog, rain, lightning, and city windows. City geometry is registered independently of the weather engine.

The recommendation rule is deliberately interpretable: prioritize events whose preparation window has already started, then nearer deadlines, then higher weights. A Node.js self-check exercises the core scoring and ordering rules.

## Challenges we ran into

The central design challenge was turning a complex schedule into something immediately understandable without pretending to measure a student's mental health. We separated a planning heuristic from clinical stress claims and kept the underlying rules visible and adjustable.

Another challenge was connecting the visual experience to a useful action. The city is not just decoration: completing a task briefly returns the user to the scene so the change in workload becomes visible.

## Accomplishments

- A working end-to-end loop: enter events, see a forecast, choose a next task, complete work, and see the scene respond.
- Separate interactions for submission tasks and preparation-based events.
- A locally relevant Hong Kong city with familiar warning signals used explicitly as a metaphor.
- A small, modular, browser-local implementation with automated engine checks.

## What we learned

Dates alone do not express preparation time. Making preparation windows explicit changes how a schedule can be understood. We also learned that a visual metaphor works best when paired with a concrete next step—not simply a dramatic warning.

## What's next

Next priorities are testing the interface with students, checking calendar import edge cases, improving accessibility and language support, and validating whether the task suggestions actually help people plan. Longer term, we would explore effort estimates and spreading work across available study time.

## Built with

HTML · CSS · JavaScript · Three.js · WebGL · localStorage · iCalendar (.ics)

## Before publishing

- Confirm all claims above against the final build; edit the reflections to match your actual experience.
- Replace “we” with “I” if you prefer a solo-author narrative.
- Add a verified AI-use disclosure naming only tools actually used and their roles.
- Confirm the reused-code boundary and disclose pre-hackathon floating-city experiments. Preserve third-party license notices.
- Do not claim user-study results, frame-rate measurements, deployment availability, or accessibility compliance without evidence.
- Deadline is 10:00 HKT. Per the author's confirmation, lack of a team is not being treated as a submission blocker.

## Suggested demo video — approximately 2 minutes 40 seconds

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:15 | Hong Kong city on the pinned storm day | “Five deadlines. One Friday. A calendar tells me when they are due—but what should I start today?” |
| 0:15–0:35 | Today's weather and next storm | “Storm Semester turns academic workload into a forecast, so I can see the build-up before it hits.” |
| 0:35–0:55 | Suggested task and preparation window | “This suggestion comes from a simple rule: preparation windows first, then deadline urgency. The rules are visible, not a black box.” |
| 0:55–1:15 | Exam preparation checklist | “An exam is not something I submit. I track preparation separately, without pretending that checking a box removes the exam's workload.” |
| 1:15–1:50 | Complete submission tasks; show the city between actions | “As I complete submission tasks, their workload disappears and the city responds. The forecast turns into feedback.” |
| 1:50–2:10 | Edit a weight or window; show forecast changing | “Every schedule is different. I can adjust the defaults instead of accepting a universal stress score.” |
| 2:10–2:25 | Import preview and city switch | “It runs in the browser, supports calendar import, and keeps event state locally.” |
| 2:25–2:40 | Clearer city and closing title | “This is a planning tool, not a diagnosis. See the storm early. Choose your next step.” |
