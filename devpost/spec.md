---
doc: spec
status: approved
---

# OnHours — Technical Spec

## How This Works, In Plain Language
OnHours is one web page served by a very small Node.js program on your own computer.

- **The page** (HTML, CSS and plain JavaScript) holds the notice box, the area list, the jobs list, the timeline and the Copy plan button.
- **The notice reader** lives in the Node program. The page sends it the pasted text; it sends back the areas and their outage times. If an AI model is configured, the reader asks the model to turn the text into a fixed JSON shape and checks the answer. If no model is configured, or the answer is wrong, it uses built-in rules instead.
- **The planner** is a small piece of JavaScript that takes the outages for one area and the jobs, and places each job in an unbroken powered stretch. The page and the tests use the same file.

Why this shape: the only part that needs an AI is reading loose human wording; the plan itself must be predictable and checkable, so it is ordinary code. No database, no framework and no installed packages, so anyone can run it with Node alone.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. The browser asks the Node server for `/` → it returns `public/index.html`, the stylesheet, fonts and scripts.
2. The page asks `GET /api/status` → `{ "ai": true|false }`, and shows whether the AI reader is on.
3. Use the sample notice → the page puts `SAMPLE_NOTICE` from `public/sample.js` into the box and the sample jobs into the list.
4. Read the notice → `POST /api/read-notice` with `{ "text": "..." }` → `server/read-notice.js` tries the model, then the rules → `{ "areas": [{ "name", "off": [{ "start": "HH:MM", "end": "HH:MM" }] }], "reader": "ai"|"rules", "note"? }`.
5. The page fills the area list. Choosing an area shows its outages.
6. Plan my day → the page calls `planDay({ outages, jobs })` from `public/planner.js` → `{ powered, placed, unplaced }`.
7. The page draws the timeline and the list, and builds the message for Copy plan with `planToText()`.

## Stack
- **Node.js 20 or newer**, no npm packages. Built-in `http`, `fs`, `fetch` and `node:test`. Docs: https://nodejs.org/api/http.html, https://nodejs.org/api/test.html. Why: nothing to install, nothing to keep up to date; runs the same on any laptop.
- **Plain HTML, CSS and ES modules** in the browser. Why: one page, no build step.
- **An OpenAI-compatible chat endpoint, optional.** `POST {LLM_BASE_URL}/chat/completions`. Docs: https://platform.openai.com/docs/api-reference/chat/create. Any compatible service works; the team's own runs use the company's model gateway.
- Fonts: Newsreader and Inter, both under the SIL Open Font License, shipped in `public/fonts/` with their licences.

## Where It Runs and How Someone Tries It
- Runs on your computer: `node server/index.js`, then open http://localhost:5174.
- No key needed: without one the built-in rules read the notice.
- To switch the AI reader on, set three environment variables before starting: `LLM_BASE_URL` (ending in `/v1`), `LLM_API_KEY` and `LLM_MODEL`. `.env.example` lists them; the server never writes or prints the key.
- Tests: `node --test`.
- Demo recording: start the server, open the page at 1280 × 800, run the core journey with the sample notice. Deployment is not planned; the video and a public repository are the submission.

## Look and Feel
Carried from `prd.md > Look and Feel`.
- Colours: paper `#FBF8F1`, card `#FFFFFF`, ink `#1D1B16`, muted ink `#6B665C`, sunlight `#F5C04A` (powered time, main button with ink text), sunlight tint `#FCEFC9`, outage hatch `#E9E5DC` with `#D8D2C5` stripes, focus ring `#2F6FEB`.
- Type: Newsreader for headings (large, light weight), Inter for body and controls; tabular figures for times.
- Spacious: 8 px grid, 20 px card radius, soft shadow, 48 px minimum tap targets.
- Copy: short and plain, second person ("Your day", "Didn't fit").
- Light only. No `prefers-color-scheme: dark` styles.

## Components

### Server (`server/index.js`)
Serves `public/` with correct content types, `GET /api/status`, and `POST /api/read-notice`. Rejects bodies over 16 KB (413) and text over 8,000 characters (400). Never echoes the input in errors. Listens on `PORT` or 5174, on 127.0.0.1.
PRD ref: `prd.md > Reading the notice`.

### Notice reader (`server/read-notice.js`)
`readNotice(text, env)`. If `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` are all set, calls the model with a system prompt that names every key of the JSON shape, `temperature: 0`, a 20-second timeout, and validates the reply (`validateAreas`). On any failure, or with no model, uses `rulesRead(text)` and adds a note.
PRD ref: `prd.md > Reading the notice`, `prd.md > States and Boundaries`.

### Rules reader (`server/rules.js`)
`rulesRead(text)`. Line by line: finds time ranges (`05:00-09:00`, `5am to 9am`, `17h00–21h00`, `05:00 / 13:00`), takes the text before the first time as the area label, strips "Group N –" prefixes, splits on commas, "&" and "and". Ranges that cross midnight are split.
PRD ref: `prd.md > Reading the notice`.

### Planner (`public/planner.js`)
`planDay({ outages, jobs, dayStart = "05:00", dayEnd = "23:00" })`. Works in minutes from midnight. Powered stretches = the day minus merged outages. Sort: must-do first, then longer first, then list order. Each job takes the earliest free gap of at least its length inside a powered stretch. `unplaced` items carry `reason`. `planToText(plan, area)` builds the message.
PRD ref: `prd.md > Planning the day`, `prd.md > Sharing the plan`.

### Page (`public/index.html`, `public/app.js`, `public/styles.css`)
Holds the inputs, the area picker, the jobs editor, the timeline (absolute-positioned blocks on a 05:00–23:00 scale) and the plan list.
PRD ref: `prd.md > The Core Journey`, `prd.md > Choosing the area`, `prd.md > The jobs list`.

## Data Model
All in the page's memory; nothing is stored.
- Area: `{ name: string, off: [{ start: "HH:MM", end: "HH:MM" }] }`.
- Job: `{ id, name, minutes, must: boolean }`.
- Plan: `{ powered: [{start,end}], placed: [{ job, start, end }], unplaced: [{ job, reason }] }` (times as minutes).
Leaving the page clears everything (`prd.md > States and Boundaries`).

## File Structure

```
onhours/
├── server/
│   ├── index.js         # HTTP server: static files, /api/status, /api/read-notice
│   ├── read-notice.js   # model call, reply check, fallback to rules
│   └── rules.js         # built-in notice reader
├── public/
│   ├── index.html       # the one page
│   ├── styles.css       # light theme, layout, timeline
│   ├── app.js           # page behaviour
│   ├── planner.js       # planDay() and planToText(), shared with the tests
│   ├── sample.js        # the fictional sample notice and jobs
│   └── fonts/           # Newsreader, Inter and their licences
├── test/
│   ├── planner.test.js
│   └── rules.test.js
├── devpost/             # scope, PRD, spec, checklist, app map
├── submission/          # demo video and Devpost text draft
├── .env.example         # the three model settings, no values
├── package.json         # start and test scripts, no dependencies
├── README.md
├── CLAUDE.md
└── PROGRESS.md
```

## External Services and Dependencies
- **Chat model (optional).** `POST {LLM_BASE_URL}/chat/completions`, header `Authorization: Bearer {LLM_API_KEY}`, body `{ model, temperature: 0, max_tokens: 1200, messages: [system, user], response_format: { type: "json_object" } }`. Reply: `choices[0].message.content`, a JSON object `{ "areas": [...] }`. One call per Read the notice press. Cost depends on the provider; the team's runs use a small model through its own gateway, well under one US dollar per thousand reads.
- Nothing else.

## Important Failure Modes
- **Model slow, down or returns bad JSON** → the rules reader answers and the note says "AI reader unavailable, read by built-in rules".
- **Notice wording the rules cannot read** → that area is missing or incomplete; the outage times shown beside the chosen area let the user check before planning.
- **Clipboard blocked by the browser** → the plan text is shown selected in a box to copy by hand.

## What Was Simplified and Why
- **One fixed day, 05:00 to 23:00** instead of a chosen day range — one less choice in the proof of concept.
- **Jobs never split** instead of pausable jobs — the kernel is "fits in one go".
- **No saved jobs** instead of a household profile — nothing to store, nothing personal kept.

## Decisions and Open Issues
- The model reads; code plans (team decision): the plan is the same every time and testable.
- No packages (team decision): anyone with Node can run it from a clean checkout.
- The uncertainty explored: whether a small model returns the JSON shape reliably enough. Checked during the build by running the sample notice through the AI reader and comparing with the rules reader's result for the tidy lines; the reply checker and fallback cover a bad answer.
- Open: none.
