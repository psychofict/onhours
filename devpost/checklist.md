---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. A pasted notice becomes a planned day on a timeline**
  Becomes usable: Paste a notice (or use the sample), read it with the built-in rules, choose an area, press Plan my day, and see the timeline, the plan list and the Didn't fit list for the six sample jobs.
  Why now: This is the kernel (jobs placed only in unbroken powered stretches, with reasons for misses) plus the shortest real way to feed it, with the scaffold inside it. It works with no key, so a clean checkout runs.
  PRD ref: `prd.md > The Core Journey` (steps 1-8), `prd.md > Planning the day`, `prd.md > Reading the notice`, `prd.md > Choosing the area`
  Spec ref: `spec.md > Planner (public/planner.js)`, `spec.md > Rules reader (server/rules.js)`, `spec.md > Server (server/index.js)`, `spec.md > Page (public/index.html, public/app.js, public/styles.css)`, `spec.md > File Structure`
  Build: package.json, the server with static files and `POST /api/read-notice` (rules only, size limits), `rulesRead()`, `planDay()` and `planToText()`, the sample data, the page with the area picker, outage line, timeline and lists.
  Verify (mechanical): `node --test` passes the planner and rules tests; curl to `/api/read-notice` with the sample returns Riverside East with three outages and a 20 KB body gets 413; a headless browser run of the journey shows five blocks and one Didn't fit line.
  Learner check: Open http://localhost:5174, use the sample notice, read it, choose Riverside East, plan, and check every block sits in a yellow stretch and the beans are under Didn't fit.
  Commit: `Plan a day from a pasted notice`

- [x] **2. The AI reader handles loose wording, with the rules as fallback**
  Becomes usable: With a model configured, "off from 4 in the afternoon until 8pm" is read; without one, or on failure, the rules answer and the note says so.
  Why now: The riskiest outside dependency, added after the app already works without it.
  PRD ref: `prd.md > Reading the notice`, `prd.md > States and Boundaries` (AI unavailable)
  Spec ref: `spec.md > Notice reader (server/read-notice.js)`, `spec.md > External Services and Dependencies`
  Build: `readNotice()` with the prompt, timeout, reply check and fallback; `/api/status`; the reader note on the page.
  Verify (mechanical): unit tests of `validateAreas` and of the fallback with an unreachable model; one live read of the sample through the model gives Hillside Extension 02:00–06:00 and 16:00–20:00.
  Learner check: Read the sample with the AI on and look at Hillside Extension's outages.
  Commit: `Read notices with an AI model, falling back to rules`

- [x] **3. The jobs list can be edited and the plan copied**
  Becomes usable: Add, edit and remove jobs; Copy plan puts the message on the clipboard.
  Why now: Completes the loop for a real household once the plan and the input both work.
  PRD ref: `prd.md > The jobs list`, `prd.md > Sharing the plan`
  Spec ref: `spec.md > Page (public/index.html, public/app.js, public/styles.css)`, `spec.md > Planner (public/planner.js)`
  Build: `public/jobs.js` (the editor and skipped-job notes) and `public/share.js` (Copy plan with the manual fallback), wired into the page.
  Verify (mechanical): headless browser adds a 30-minute job, plans, finds it placed; Copy plan shows "Copied" and the clipboard text starts with the area title.
  Learner check: Add "Charge the radio, 30 min", plan, copy, paste into a note.
  Commit: `Edit jobs and copy the plan`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 1, the sample day on screen at 1280 and 390 px wide. Feedback: short blocks clipped their names on a phone and "2 h" wrapped; fixed with a single-line short block and non-breaking durations.
- [x] Final kick-the-tires exploration and feedback completed — the full journey run at 1280 and 390 px, with an added job, an empty job row, a different area (Kopje Heights) and Copy plan. Feedback: job names were cut off in the editor; fixed with a two-row job card.

## Final Review

- [x] Job names fully visible in the editor at both widths (two-row job card), verified by screenshot
- [x] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — focused alternative: the spec's open question (does a small model return the JSON shape reliably?) was answered with a live read and the fallback tests
- [x] Optional edit and transfer reflection addressed — not applicable; covered by the practice note in the app map
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: live AI read of the sample notice (all six areas, Hillside Extension 02:00–06:00 and 16:00–20:00); `test/read-notice.test.js` covers the reply check and the fallback.
Route and stops: reference route only, listed in the app map (`public/app.js` readNotice/plan, `server/read-notice.js` readNotice/validateAreas, `public/planner.js` planDay).
Edit outcome: not applicable.
Reflection: not applicable.
Activity mode: focused alternative.

## Revisions

- Merged the first two planned slices (sample day on a timeline; rules reader and area picker) into one — the page could not be tried end to end without a way to read the notice, and the kernel is only meaningful on real outage times. The jobs editor and Copy plan moved into their own modules (`public/jobs.js`, `public/share.js`) so the last slice adds them without rewriting the page script.
- Verified the AI reader live on 16 Oct 2026 with a small model (gpt-oss-20b) through the team's OpenAI-compatible gateway: the sample notice read in 1.5 s, all six areas correct, Hillside Extension 02:00–06:00 and 16:00–20:00 (the rules read only 02:00–06:00). One call cost US$0.0002.
