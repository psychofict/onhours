---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [ ] **1. The sample day is planned and drawn on a timeline**
  Becomes usable: A running page that plans Riverside East's sample day with the six sample jobs and draws the timeline, the plan list and the Didn't fit list.
  Why now: This is the kernel (jobs placed only in unbroken powered stretches, with reasons for misses). Everything else feeds it, so it comes first, with the scaffold inside it.
  PRD ref: `prd.md > Planning the day`, `prd.md > The Core Journey` (steps 6-8)
  Spec ref: `spec.md > Planner (public/planner.js)`, `spec.md > Server (server/index.js)`, `spec.md > Page (public/index.html, public/app.js, public/styles.css)`, `spec.md > File Structure`
  Build: package.json, server serving `public/`, sample data, `planDay()` and `planToText()`, the page with the timeline and lists using the sample area's outages.
  Verify (mechanical): `node --test` passes the planner test for the exact sample placements; the server starts and `/` answers 200; a headless browser shows five blocks and one Didn't fit line.
  Learner check: Open http://localhost:5174, press Plan my day, and check every block sits in a yellow stretch and the beans are under Didn't fit.
  Commit: `Plan the sample day on a timeline`

- [ ] **2. Any pasted notice is read by the built-in rules and an area can be chosen**
  Becomes usable: Paste a notice, press Read the notice, choose an area, see its outages, plan its day.
  Why now: The input path without any model; the app must work from a clean checkout with no key.
  PRD ref: `prd.md > Reading the notice`, `prd.md > Choosing the area`, `prd.md > States and Boundaries` (nothing found)
  Spec ref: `spec.md > Rules reader (server/rules.js)`, `spec.md > Server (server/index.js)`
  Build: `rulesRead()`, `POST /api/read-notice` with size limits, the area picker and outage line, the Use the sample notice button.
  Verify (mechanical): `node --test` passes the rules test on the sample notice; curl to `/api/read-notice` returns Riverside East with three outages; a body over 16 KB gets 413.
  Learner check: Use the sample notice, read it, choose Kopje Heights, then Riverside East, and plan each.
  Commit: `Read pasted notices with built-in rules`

- [ ] **3. The AI reader handles loose wording, with the rules as fallback**
  Becomes usable: With a model configured, "off from 4 in the afternoon until 8pm" is read; without one, or on failure, the rules answer and the note says so.
  Why now: The riskiest outside dependency, after the app already works without it.
  PRD ref: `prd.md > Reading the notice`, `prd.md > States and Boundaries` (AI unavailable)
  Spec ref: `spec.md > Notice reader (server/read-notice.js)`, `spec.md > External Services and Dependencies`
  Build: `readNotice()` with the prompt, timeout, reply check and fallback; `/api/status`; the reader note on the page.
  Verify (mechanical): unit test of `validateAreas` and of the fallback with an unreachable model; one live read of the sample through the model gives Hillside Extension 02:00–06:00 and 16:00–20:00.
  Learner check: Read the sample with the AI on and look at Hillside Extension's outages.
  Commit: `Read notices with an AI model, falling back to rules`

- [ ] **4. The jobs list can be edited and the plan copied**
  Becomes usable: Add, edit and remove jobs; Copy plan puts the message on the clipboard.
  Why now: Completes the loop for a real household once the plan and the input both work.
  PRD ref: `prd.md > The jobs list`, `prd.md > Sharing the plan`
  Spec ref: `spec.md > Page (public/index.html, public/app.js, public/styles.css)`, `spec.md > Planner (public/planner.js)`
  Build: the jobs editor, skipped-job notes, Copy plan with the manual fallback.
  Verify (mechanical): headless browser adds a 30-minute job, plans, finds it placed; Copy plan shows "Copied" and the clipboard text starts with the area title.
  Learner check: Add "Charge the radio, 30 min", plan, copy, paste into a note.
  Commit: `Edit jobs and copy the plan`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1, the sample day on screen at 1280 and 390 px wide
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: not started
Route and stops: not started
Edit outcome: not started
Reflection: not started
Activity mode: not started

## Revisions
