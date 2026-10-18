# OnHours

Plan your day around the power cuts. Paste the outage notice you were sent, list the jobs that need electricity, and OnHours fits each job into an unbroken stretch of the hours the power is on. Anything that cannot fit is listed with the reason, and the plan copies as text for the family chat.

Built for Devpost's Build With AI: Basics with the Devpost Learn skill pack. The planning documents are in [`devpost/`](devpost/): [scope](devpost/scope.md), [product requirements](devpost/prd.md), [technical spec](devpost/spec.md) and the [build checklist](devpost/checklist.md).

## Run it

You need [Node.js](https://nodejs.org/) 20 or newer. There are no packages to install.

```sh
git clone <this repository>
cd onhours
node server/index.js
```

Open http://localhost:5174, then:

1. Press **Use the sample notice**, then **Read the notice**.
2. Choose **Riverside East** in Your area.
3. Press **Plan my day**.

The timeline shows the outages as grey bands and the powered hours in yellow, with every job placed inside a powered stretch long enough for it. "Slow-cook the beans" needs 5 h 30 min in one go, so it appears under Didn't fit with the reason. Press **Copy plan** to copy the message.

The sample notice, areas and jobs are fictional.

## The AI reader (optional)

Without any setup, built-in rules read the notice. They handle tidy formats such as `05:00-09:00`, `5am to 9am` and `17h00–21h00`.

To let an AI model read loose wording ("off from 4 in the afternoon until 8pm"), set three variables before starting the server. Any OpenAI-compatible chat endpoint works:

```sh
export LLM_BASE_URL=https://your-provider.example/v1   # ends in /v1
export LLM_API_KEY=your-key
export LLM_MODEL=your-model
node server/index.js
```

`.env.example` lists the same names. The key stays on the server and is never sent to the browser or written to disk. If the model is slow, unreachable or answers in the wrong shape, the built-in rules take over and the page says so. The model only reads the notice; ordinary code places the jobs, so the same notice and jobs always give the same plan.

## Tests

```sh
node --test
```

The tests cover the planner (the sample day's exact placements, no job crossing an outage, merged and clipped outages, skipped jobs, the copied text), the built-in reader on the sample and other formats, and the AI reader's reply check and fallback.

## How it fits together

| Path | What it does |
| --- | --- |
| `server/index.js` | Serves the page, `GET /api/status` and `POST /api/read-notice` (16 KB body limit) |
| `server/read-notice.js` | Asks the model for JSON, checks the reply, falls back to the rules |
| `server/rules.js` | The built-in notice reader |
| `public/planner.js` | `planDay()` and `planToText()`, shared by the page and the tests |
| `public/app.js` | Page behaviour: reading, area choice, drawing the timeline |
| `public/jobs.js`, `public/share.js` | The jobs editor and Copy plan |

Fonts: Newsreader and Inter, under the SIL Open Font License (`public/fonts/`).

## Licence

OnHours is released under the MIT License (see [`LICENSE`](LICENSE)). The fonts keep their own SIL Open Font License.

## Re-installing the skill pack

The Devpost Learn skills are not stored in this repository. To run them again in a checkout:

```sh
npx skills add challengepost/learn-ai-basics --all -y
```

`skills-lock.json` records the versions used.
