---
doc: spec
status: approved
---

# OnHours — Technical Spec

## How This Works, In Plain Language
OnHours is one web page served by a very small Node.js program. The page does almost everything, and keeps working after the program, the network and the power have gone.

- **The page** holds the notice (a photo or text), the area choice, the backup setting, the jobs list, the plan and the sharing buttons. It is plain HTML, CSS and JavaScript with no build step.
- **The notice reader** is the only part that may use an AI model. The page sends it a photo or text; it asks the model to read the notice into a fixed JSON shape, checks every field of the answer, and sends back areas with their outage times. If no model is set up, or its answer fails the check, built-in rules read the text instead. The same rules also run in the page, so text can be read with no network at all.
- **The planner** is a small piece of JavaScript that takes the outages for one area, the jobs and the backup hours, and places each job in an unbroken stretch. It is the same file for the page and the tests. The model never sees it.
- **The saved household** is a few lines of browser storage: jobs, area, backup, the last notice. Nothing is sent anywhere.
- **The offline layer** is a service worker, a small script the browser keeps, which stores the page's own files the first time it loads so they open with no network, and a manifest that lets the page be added to a phone's home screen.

Why this shape: the only part that needs an AI is reading messy human input, a picture or loose wording. Everything that decides the plan is ordinary code, so the plan is checkable and always the same for the same inputs. No database, no framework and no installed packages, so anyone with Node can run it from a clean checkout.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. The browser asks the server for `/` and gets `public/index.html`, the stylesheet, fonts and scripts. The service worker stores them.
2. The page asks `GET /api/status` and gets `{ "ai": true|false, "vision": true|false }`. If the request fails (no network), the page keeps the last answer it saved.
3. Photo: the page shrinks the picture in a canvas (`public/photo.js`) and sends `POST /api/read-notice` with `{ "image": "data:image/jpeg;base64,..." }`. The server asks the model to return `{ "transcript", "areas" }`, checks the areas, and returns them. If the areas fail the check but the transcript is usable, the rules read the transcript.
4. Text: with the AI on and a network, the page sends `{ "text": "..." }` to the same route. With no AI, or no network, the page calls `rulesRead()` from `public/rules.js` itself.
5. The page fills the area choices. Choosing an area shows its outages and a small ribbon.
6. Plan my day: the page calls `planDay({ outages, jobs, backupMinutes })` and gets `{ powered, off, placed, unplaced, skipped, backup }`.
7. `public/draw.js` draws the Right now card (from `public/now.js`), the ribbon, the timeline and Didn't fit. `public/store.js` saves the household.
8. Sharing: `public/card.js` draws the plan picture on a canvas, `public/ics.js` builds the calendar file, and `planToText()` builds the message.
9. Offline: the service worker answers every request for the page's own files from its store, and the page restores the household from browser storage and plans again at once.

## Stack
- **Node.js 20 or newer**, no npm packages. Built-in `http`, `fs`, `fetch` and `node:test`. Docs: https://nodejs.org/api/http.html, https://nodejs.org/api/test.html. Why: nothing to install or keep up to date.
- **Plain HTML, CSS and ES modules** in the browser. Why: one page, no build step, and the files are small enough for the service worker to store.
- **Web platform features**: service workers and the Cache API (https://developer.mozilla.org/docs/Web/API/Service_Worker_API), the web app manifest (https://developer.mozilla.org/docs/Web/Manifest), `localStorage`, canvas, `<dialog>`, and the Web Share API where present. Why: they are what make a page behave like an installed app without an app store.
- **An OpenAI-compatible chat endpoint, optional.** `POST {LLM_BASE_URL}/chat/completions`. Docs: https://platform.openai.com/docs/api-reference/chat/create. Any compatible service works. A second, optional model name (`LLM_VISION_MODEL`) is used for photos, so one endpoint can serve a text model and a vision model.
- **Fonts**: Newsreader and Geist, both under the SIL Open Font License, shipped in `public/fonts/` with their licences. Inter from version 1 is removed.

## Where It Runs and How Someone Tries It
- Runs on your computer: `node server/index.js`, then open http://localhost:5174. After the first visit, the page also opens with the server stopped.
- No key needed. Without one, text is read by the built-in rules and the Photo tab says photo reading needs the AI reader.
- To switch the AI reader on, set three variables before starting: `LLM_BASE_URL` (ending in `/v1`), `LLM_API_KEY` and `LLM_MODEL`. To switch photo reading on, also set `LLM_VISION_MODEL` (or set `LLM_VISION=1` to use `LLM_MODEL` for photos). `.env.example` lists them; the server never writes or prints the key, and the browser never receives it.
- Tests: `node --test`.
- Demo clock: add `?now=14:20` to the address to set the "Right now" card's clock.
- Recording: `submission/BUILD-VIDEO.md` has the commands that record and assemble the demo video from the running app. Deployment is not planned; the video and a public repository are the submission.

## Look and Feel
Carried from `prd.md > Look and Feel`.
- Colours: paper `#F7F1E8`, card `#FFFFFF`, ink `#1C1B1A`, stone `#4A4741` for secondary text and buttons, hairline `#E1DCD3`, power-on mustard ramp (tint `#FBF0CF`, band `#F3DC9B`, job `#E5B54F`, edge `#AF751B`), outage grey hatch (`#EFEBE3` with `#DDD6C8` stripes), backup olive ramp (pale `#DCE2C8`, mid `#849671`, deep `#5C6F5D`), action blue `#2A72DE` with white text, error `#B3402A`.
- Type: Newsreader light for headlines and large figures (clamped between 40 and 84 px for the opening), Geist for everything read, tabular figures for every time.
- Shape and motion: pill buttons, 24 px cards inside a 6 px paper rim (a second, lighter shell), soft diffused shadows, 48 px minimum tap targets, springy `cubic-bezier(0.32, 0.72, 0, 1)` transitions on transform and opacity only, staggered rise-in for plan blocks, and none of it when the visitor asks for reduced motion.
- Copy: second person, short, honest. "Didn't fit", "Right now", "Forget this device".
- Light only. No `prefers-color-scheme: dark` styles and no dark filled area.

## Components

### Server (`server/index.js`)
Serves `public/` with correct content types and `Cache-Control: no-cache`, the service worker with no caching, `GET /api/status`, and `POST /api/read-notice`. Text bodies are capped at 16 KB and 8,000 characters; image bodies at 2.5 MB. Bodies are counted as they arrive, errors never echo the input, and security headers are set on every response. Listens on `PORT` or 5174, on 127.0.0.1.
PRD ref: `prd.md > Reading the notice`.

### Notice reader (`server/read-notice.js`)
`readNotice(text, env)` and `readNoticeImage(dataUrl, env)`. When the model settings are present, calls the model with a system prompt that names every key of the JSON shape, `temperature: 0`, a 20-second timeout (a longer one for photos), and validates the reply (`validateAreas`). A photo is sent as an `image_url` content part. On any failure, or with no model, uses `rulesRead()`, on the transcript for a photo, and adds a note. A photo with no usable transcript returns `{ areas: [], reader: "none", error }`. The image is held in memory for the request and never written anywhere or logged.
PRD ref: `prd.md > Reading the notice`, `prd.md > States and Boundaries`.

### Rules reader (`public/rules.js`)
`rulesRead(text)`, moved from the server folder so the page can use it too. Line by line: finds time ranges (`05:00-09:00`, `5am to 9am`, `17h00–21h00`), takes the text before the first time as the area label, strips "Group N –" prefixes, splits on commas, "&" and "and", and splits ranges that cross midnight. Also reads table rows from a photo's transcript (`2 | Riverside East, Siding Road | 05:00 – 09:00`).
PRD ref: `prd.md > Reading the notice`.

### Planner (`public/planner.js`)
`planDay({ outages, jobs, backupMinutes = 0, dayStart = "05:00", dayEnd = "23:00" })`. Works in minutes from midnight. Powered stretches are the day minus merged outages. Jobs are sorted must-do first, then longer first, then list order. For each job it looks for the earliest start (on the hour grid of five minutes, or the start of a free gap) where the whole job lies in time no other job holds and touches no outage. If there is none, and the job runs on backup, it looks for the earliest such start where the outage minutes inside the job fit in the backup left, and records those minutes as `onBackup`. A job that fits nowhere goes to `unplaced` with a reason. `planToText(plan, areaName)` builds the message.
PRD ref: `prd.md > Planning the day`, `prd.md > Sharing the plan`.

### Right now (`public/now.js`)
`nowStatus(plan, minute)` returns whether the power is on, until when, the job running, whether it runs on backup, and the next job. A pure function, tested with the sample day at 08:00, 13:30 and 20:30.
PRD ref: `prd.md > Right now`.

### Plain-words jobs (`public/jobtext.js`)
`parseJobs(text)` splits on commas, semicolons, new lines and "and", reads a duration (`45 min`, `1 h`, `1.5 hours`, `an hour`, `half an hour`, `2h30`) and keeps the rest as the name. Returns `{ jobs, unread }`.
PRD ref: `prd.md > The jobs list`.

### Saved household (`public/store.js`)
`loadHousehold()`, `saveHousehold(state)` and `forgetHousehold()` over `localStorage` under one key, versioned. Reading a bad or old record gives the first-visit state.
PRD ref: `prd.md > Works with no power and no network`.

### Page (`public/index.html`, `public/app.js`, `public/draw.js`, `public/jobs.js`, `public/styles.css`)
`app.js` holds the state and wires the steps; `draw.js` draws the ribbon, timeline, Right now and Didn't fit; `jobs.js` is the jobs editor; `photo.js` shrinks pictures (longest side 1,600 px, JPEG).
PRD ref: `prd.md > The Core Journey`, `prd.md > Choosing the area and the backup`, `prd.md > The jobs list`.

### Sharing (`public/share.js`, `public/card.js`, `public/ics.js`)
Copy plan (with the select-by-hand fallback), the plan picture dialog (canvas at 1,080 x 1,350 px, Share where `navigator.canShare` allows files, otherwise Download), and the calendar file (floating local times, an alarm ten minutes before each job and each outage).
PRD ref: `prd.md > Sharing the plan`.

### Offline layer (`public/sw.js`, `public/manifest.webmanifest`, `public/icons/`)
`sw.js` stores the page's files when it is installed, answers requests from the store first and refreshes the store in the background, and never touches `/api/`. The manifest names the app, sets the standalone display, the paper colour and the icons.
PRD ref: `prd.md > Works with no power and no network`.

## Data Model
In the page's memory, with the household also saved in `localStorage` under `onhours.v2`.
- Area: `{ name: string, off: [{ start: "HH:MM", end: "HH:MM" }] }`.
- Job: `{ id, name, minutes, must: boolean, backup: boolean }`.
- Household: `{ v: 2, notice: string, areas: Area[], area: string, backupMinutes: number, day: "today" | "tomorrow", jobs: Job[] }`. The service worker's store holds only the page's own files.
- Plan: `{ off, powered, placed: [{ job, start, end, onBackup: [{ start, end }] }], unplaced: [{ job, reason }], skipped, backup: { total, used } }`, times in minutes.
Leaving and returning restores the household and draws the plan again; Forget this device removes the saved record. Photos are never stored.

## File Structure

```
onhours/
├── server/
│   ├── index.js         # HTTP server: static files, /api/status, /api/read-notice
│   └── read-notice.js   # model call (text and photo), reply check, fallback to rules
├── public/
│   ├── index.html       # the one page
│   ├── styles.css       # light theme, layout, ribbon, timeline
│   ├── app.js           # page behaviour and state
│   ├── draw.js          # ribbon, timeline, Right now, Didn't fit
│   ├── planner.js       # planDay() and planToText(), shared with the tests
│   ├── now.js           # nowStatus()
│   ├── rules.js         # built-in notice reader, shared by server and page
│   ├── jobtext.js       # plain-words job entry
│   ├── jobs.js          # the jobs editor
│   ├── store.js         # saved household
│   ├── photo.js         # shrink a picture before sending
│   ├── share.js         # copy, plan picture dialog, calendar download
│   ├── card.js          # draws the plan picture
│   ├── ics.js           # builds the calendar file
│   ├── sample.js        # the fictional sample notice and jobs
│   ├── sample-notice.jpg# the fictional sample photo
│   ├── sw.js            # service worker
│   ├── manifest.webmanifest
│   ├── icons/
│   └── fonts/           # Newsreader, Geist and their licences
├── test/                # planner, rules, read-notice, jobtext, now, ics, store, server
├── tools/               # how the sample photo and the icons were made
├── devpost/             # scope, PRD, spec, checklist, upgrade plan, app map
├── submission/          # video, captions, script, gallery, Devpost text, checks
├── .env.example         # the model settings, no values
├── package.json         # start and test scripts, no dependencies
├── README.md  CLAUDE.md  PROGRESS.md  LICENSE
```

## External Services and Dependencies
- **Chat model (optional).** `POST {LLM_BASE_URL}/chat/completions`, header `Authorization: Bearer {LLM_API_KEY}`. Text body: `{ model, temperature: 0, max_tokens: 1200, messages: [system, user], response_format: { type: "json_object" } }`. Photo body: the same, with `model` from `LLM_VISION_MODEL`, a larger `max_tokens`, and a user message whose content is a text part and an `image_url` part holding the data URL. Reply: `choices[0].message.content`, a JSON object (`{ "areas": [...] }` for text, `{ "transcript": "...", "areas": [...] }` for photos). One call per read. Cost depends on the provider; the team's runs use small models through its own gateway and one read costs a fraction of a US cent.
- The team's own runs use the company's model gateway for both text and photo reading. Its address and key come from the environment and are not in this repository.
- Nothing else. The page calls no third-party host, loads no remote font or script, and sends no analytics.

## Important Failure Modes
- **Model slow, down or returns bad JSON for text** → the rules answer and the note says "The AI reader was unavailable, so the built-in rules read it."
- **Model cannot read a photo** → the rules read its transcript if there is one; otherwise "I couldn't read that photo. Try again, or paste the text."
- **No network** → the page opens from the service worker, reads text with the rules, and pauses photo reading with a plain note.
- **Browser storage blocked or full** → the page works for this visit and says "This browser won't save your household."
- **Clipboard or share blocked** → the plan text is shown selected, or the picture is offered as a download.

## What Was Simplified and Why
- **One fixed day, 05:00 to 23:00**, for today or tomorrow, instead of a chosen day range: one less choice.
- **Jobs never split**: the kernel is "fits in one go". A job on backup bridges an outage but stays one job.
- **Backup is hours, not watts**: it keeps the planner honest and the screen simple. A real inverter plan would need each appliance's load.
- **Greedy placement, not a search for the best arrangement**: the same rule every time, easy to explain on screen, and tested. A search could place more jobs, but its answers would be harder to check and to narrate.
- **Browser storage, not accounts**: nothing to sign in to and nothing on a server to protect.

## Decisions and Open Issues
- The model reads; code plans: the plan is the same every time and testable. The photo path keeps the rule: the model returns areas and a transcript, never a placement.
- No packages: anyone with Node can run it from a clean checkout. The service worker, manifest, canvas and calendar file are all built from the platform.
- Rules moved to `public/`: the page can read text with no server, which is what makes the offline story true for the first step as well as the last.
- Inter replaced by Geist: the chosen design reference pairs a light serif with a quiet grotesque; Geist is installed locally and its licence allows shipping it.
- The uncertainty explored: whether a small vision model reads a photographed, slightly rotated notice, with loose wording, reliably enough. Checked before building the page: the sample photo went through the company gateway's vision tier on 20 October 2026 and all six areas came back with the right times in about 4 seconds, including "from 4 in the afternoon until 8pm". Further photos are recorded in the checklist's Revisions. The reply check and the transcript fallback cover a bad answer.
- Open: none.
