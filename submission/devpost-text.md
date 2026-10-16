# Devpost submission draft: OnHours

Draft for the Build With AI: Basics submission form. Not yet submitted.

## Project name

OnHours

## Elevator pitch

Paste the power-cut notice from your group chat. OnHours fits every job that needs electricity into an unbroken stretch of powered hours, and says plainly what won't fit.

## About the project

### Inspiration

In many cities power cuts are scheduled, and the timetable reaches people as a forwarded message in a street or family group chat. Everyone then does the same sum in their head: when is my area off, and how do I fit the water pump, the iron, the sewing machine and the phone chargers around it? The jobs that go wrong are the ones started too late, when the power drops halfway through.

Ebenworks is an AI product company for the people who keep the world running: the shop owner, the nurse, the family carer, the contractor, the organiser and the artist. OnHours is a small test of that idea for the person running a household or a home workshop around the grid.

### What it does

1. Paste the notice exactly as it arrived, loose wording and all.
2. OnHours reads every area and its outage times. "Off from 4 in the afternoon until 8pm" becomes 16:00–20:00.
3. Choose your area and check its times against the notice.
4. List the jobs that need power: how long each needs in one go, and whether it must happen today.
5. Press Plan my day. Each job goes into the earliest powered stretch that can hold the whole job, must-do jobs first, and nothing crosses an outage.
6. A job that can't fit says why ("Needs 5 h 30 min in one go; the longest powered stretch left is 2 h 15 min").
7. Copy the plan as a message for the family chat.

### How we built it

Planning came first, with the Devpost Learn skill pack: scope, product requirements and a technical spec (all in the repository's `devpost/` folder), then a build checklist of three working slices, each tested and committed before the next.

The main design decision: the AI reads, plain code decides. A language model turns the messy notice into a fixed JSON shape, and every field of its reply is checked. The planner is ordinary JavaScript, so the same notice and jobs always give the same plan, and the tests pin the sample day to the minute. If no model is configured, or the model fails, built-in rules read the common formats and the page says which reader was used.

Node.js with no packages, plain HTML, CSS and JavaScript, and any OpenAI-compatible model endpoint. A clean checkout runs with `node server/index.js`.

### Challenges we ran into

Notices mix formats: `05:00-09:00`, `5am to 9am`, `17h00–21h00`, several areas on one line, periods that cross midnight, and sentences. The rules handle the tidy forms; the AI handles the sentences; the reply check keeps a bad answer from reaching the plan.

The plan also had to be realistic. A job that needs four hours can't be split across two powered windows if it's a sewing order or a pot of beans, so OnHours never splits a job and explains every miss instead.

### Accomplishments that we're proud of

The core journey works end to end on a fresh checkout with no key at all. Switching an AI model on lets it read looser wording, and the planning stays exactly the same. The planner is covered by tests that check no job ever touches an outage.

### What we learned

Give the model the reading and keep the deciding in code. Asking for a strict shape, checking every field and keeping a plain fallback made the AI step dependable and left the rest easy to test.

### What's next for OnHours

Notices that cover a whole week, saving a household's usual jobs, jobs that can pause and resume (charging), and reading a photo of the notice.

## Built with

javascript, node.js, html, css, openai-compatible-api

## Links

- Repository: to be added when the repository is published
- Video: to be added when the video is uploaded (YouTube or Vimeo, public)
