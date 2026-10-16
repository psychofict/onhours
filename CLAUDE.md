# CLAUDE.md — OnHours

Working instructions for this repository.

## What this is

OnHours is a one-page proof of concept: paste a power-cut notice, choose an area, list the jobs that need electricity, and get a day plan that fits each job into an unbroken powered stretch. It was built with the Devpost Learn skill pack; the plan lives in `devpost/` (scope, PRD, spec, checklist). Read those before changing behaviour, and keep them in step with the code: a change to what the app does updates `devpost/prd.md`, and a change to how it is built updates `devpost/spec.md`, in the same commit.

## Run and test

- `node server/index.js`, then open http://localhost:5174. Node 20 or newer, no packages.
- `node --test` runs every test in `test/`. Run it before each commit.
- The AI reader is off unless `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` are set (see `.env.example` and README.md).

## Rules for this code

- No dependencies. The point is that a clean checkout runs with Node alone.
- The model only reads the notice. Placing jobs stays in `public/planner.js`, plain and tested, so a plan is the same every time.
- Every reply from the model goes through `validateAreas()`; anything else falls back to `rulesRead()` with a note on the page.
- Never commit a key or a real `.env`. Keys come from the environment only and never reach the browser.
- Sample data in `public/sample.js` is fictional. Demos and screenshots use it or other made-up data, never a real household.
- Light theme only: warm paper background, ink text, sunlight yellow for powered time. No dark filled areas and no `prefers-color-scheme: dark` styles.
- Check the page at 1280 and 390 pixels wide after any visual change.
- Commit messages say what changed in plain words. Update PROGRESS.md when a slice or fix lands.
