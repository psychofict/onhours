# CLAUDE.md — OnHours

Working instructions for this repository.

## What this is

OnHours is a phone-first, installable one-page proof of concept: photograph or paste a power-cut notice, choose an area, list the jobs that need electricity, set backup hours if there is a battery or inverter, and get a day plan that fits each job into an unbroken stretch, with a reason for every job that does not fit. It works offline after one visit. It was built with the Devpost Learn skill pack; the plan lives in `devpost/` (scope, PRD, spec, checklist, and `UPGRADE-PLAN.md` for version 2). Read those before changing behaviour, and keep them in step with the code: a change to what the app does updates `devpost/prd.md`, and a change to how it is built updates `devpost/spec.md`, in the same commit.

## Run and test

- `node server/index.js`, then open http://localhost:5174. Node 20 or newer, no packages.
- `node --test` runs every test in `test/`. Run it before each commit.
- With the app running, `node tools/check-journey.cjs` (the whole journey at 1280 and 390 px) and `node tools/check-acceptance.cjs` (every acceptance line of `devpost/prd.md`; it starts its own copy with no AI reader on port 5199) need `playwright-core`. Run them after a change to the page.
- The demo film is built by script from the running app: `submission/BUILD-VIDEO.md`. Every shot is timed from the narration (`tools/video/segments.cjs`), so a changed narration line means re-recording and composing again.
- The AI reader is off unless `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` are set; photo reading also needs `LLM_VISION_MODEL` (see `.env.example` and README.md).
- `?now=13:30` on the address sets the "Right now" clock, for demonstrations.

## Rules for this code

- No dependencies. The point is that a clean checkout runs with Node alone.
- The model only reads the notice (text or photo). Placing jobs stays in `public/planner.js`, plain and tested, so a plan is the same every time.
- Every reply from the model goes through `validateAreas()`; anything else falls back to `rulesRead()` where there is text to read, with a note on the page. A reply that passes the check as "no outage times" is trusted and never re-read.
- Never commit a key or a real `.env`, and never put the address of a company gateway in this repository. Keys come from the environment only and never reach the browser. A photo is held in memory for one request and never stored or logged.
- Sample data in `public/sample.js` and the sample photo are fictional. Demos and screenshots use them or other made-up data, never a real household.
- Light theme only: warm paper background, ink text. Yellow means power is on, olive means running on backup, blue means "press this". No dark filled areas and no `prefers-color-scheme: dark` styles.
- Every file the page loads must be listed in `public/sw.js` (`test/sw.test.js` fails otherwise). When a public file changes, bump `VERSION` there so installed copies refresh.
- The household (jobs, area, backup, last notice) lives in browser storage only. No accounts, no analytics, no third-party requests.
- Check the page at 1280 and 390 pixels wide after any visual change.
- Commit messages say what changed in plain words. Update PROGRESS.md when a slice or fix lands.
