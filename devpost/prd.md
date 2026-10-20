---
doc: prd
status: approved
---

# OnHours — Product Requirements

OnHours is a planner for a household or home workshop that lives with scheduled power cuts: photograph or paste the outage notice, list the jobs that need power, and get a day plan that fits each job into an unbroken stretch the power is on, on a phone that keeps working with no power and no network.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`, `scope.md > The Core Loop`.

## The Core Journey
1. Thandi opens OnHours on her phone. She sees the headline "Plan your day around the power cuts.", one example day drawn in full so she knows what she will get, and three ways in: take a photo of the notice, paste its text, or try the sample. (`scope.md > The Core Loop`)
2. She takes a photo of the notice that arrived in the group chat, or chooses the sample photo. The page shows the photo and a reading state, then a list of areas, each with its outage times, and a line saying who read it: "Read from the photo by AI" or "Read by built-in rules". The text the AI saw is placed in the Text tab so she can check it.
3. She picks her area. Its outage times show beside a small day ribbon so she can check them against the notice.
4. If she has a battery or inverter, she says how many hours it runs in a day.
5. She looks at her jobs: each has a name, a time, a Must do today switch and a Runs on backup switch. She edits them, or types new ones in plain words ("iron 45 min, pump 1 h").
6. She presses Plan my day.
7. The plan appears. At the top is Right now (when the plan is for today), then the day ribbon, then the timeline with every job inside a powered stretch or marked as running on backup, then Didn't fit with one line of reason per job.
8. She sends the plan to the family chat as a picture, adds it to her calendar with reminders, or copies it as text.
9. The power goes off and the network goes with it. She opens OnHours from her home screen. Her jobs, area and plan are still there, and Right now says when the power returns and what comes next.

## Screens and Layout
One page with a masthead, an opening section, four steps (notice, area and backup, jobs, plan) and a footer. On a phone it is one column: the steps in order, with the plan directly after Plan my day. On a laptop it is two columns: steps on the left, the plan on the right and kept in view. A dialog opens for the plan picture. There are no other pages. The first design target is a 390 px wide phone.

## Look and Feel
Carried from `scope.md > Inspiration & Identity`. Warm paper page (`#F7F1E8`), white cards with hairline borders, near-black ink. A light high-contrast serif (Newsreader) for headlines and large figures, a quiet sans (Geist) for everything read, tabular figures for times. Earth tones carry meaning: mustard for powered time and placed jobs, a grey hatch for outages, olive for time running on backup. Buttons are full pills. One action colour, blue, is used for the main action and the focus ring, so yellow always means "power is on". Spacious, with 48 px minimum tap targets, soft shadows and short, springy motion that stops for people who ask for less motion. Light only: no dark filled areas and no dark mode.

## Features and Behavior

### Reading the notice
- Two ways in, as tabs: Photo and Text. The page opens on Photo.
- Photo: choose or take a picture (up to 12 MB on the device; it is reduced to at most 1,600 px on its longest side before it is sent). A sample photo is one tap away. Reading starts at once. The photo is sent only to the AI reader and is not stored anywhere.
- Text: any pasted text up to 8,000 characters, read when she presses Read the notice. When an AI reader is switched on, it handles loose wording ("off from 4 in the afternoon until 8pm"). Otherwise, or when the AI fails, built-in rules read the common formats (`05:00-09:00`, `5am to 9am`, `17h00–21h00`). The same rules run on the phone, so reading text works with no network.
- When one line names several areas ("Group 2 – Riverside East, Siding Road"), each area appears on its own.
- Every area shows its outage times for the day, so the reading can be checked by eye.
- A line says who read it. If a photo's areas fail the check but its text was read, the rules read that text and the line says so.
- Acceptance:
  - [ ] The sample photo gives the six named areas, with Riverside East off 05:00–09:00, 13:00–15:00 and 20:00–23:00.
  - [ ] The sample text gives the same six areas with no AI configured, and the line says "Read by built-in rules".
  - [ ] With the AI off, the Photo tab says plainly that photo reading needs the AI reader and offers the Text tab; nothing breaks.
  - [ ] If the AI fails or answers badly, the rules are used where text exists, and the line says so. If a photo cannot be read at all, the page says "I couldn't read that photo" and offers to try again or paste the text.
  - [ ] Offline, text reading still works and photo reading says it needs a connection.

### Choosing the area and the backup
- The areas read from the notice are shown as a row of choices, one of which can be selected. Choosing one shows its times in plain words and a small ribbon.
- Backup power is a stepper from none to 12 hours in half-hour steps: "How long can your battery or inverter run in a day?" It starts at none. The planner assumes the battery starts the day full and is not recharged until the day ends, and the page says so.
- Acceptance:
  - [ ] Choosing Riverside East shows "Off 05:00–09:00, 13:00–15:00, 20:00–23:00".
  - [ ] The backup stepper can be used with a keyboard and announces its value.

### The jobs list
- Starts with the sample household's five jobs the first time, and with the household's saved jobs after that. Each job has a name, hours and minutes, Must do today, Runs on backup and a remove button. Add a job adds an empty row.
- A line "Type jobs in plain words" takes text such as "iron 45 min, pump water 1 h, charge phones 2 hours" and adds one job per piece. Pieces it cannot read are listed back, not dropped.
- Acceptance:
  - [ ] Adding, editing and removing a job changes the next plan.
  - [ ] "iron 45 min, pump water 1 h, charge phones 2 hours" adds three jobs of 45, 60 and 120 minutes.
  - [ ] A job with no name or no time is skipped with a short note.

### Planning the day
- The day runs from 05:00 to 23:00 and is for today or for tomorrow.
- Powered stretches are the parts of the day outside the area's outages.
- Must-do jobs are placed first, then the rest, longer first within each group. Each job goes into the earliest unbroken stretch that can hold the whole job. Jobs never overlap and never cross an outage unless they run on backup.
- A job marked Runs on backup that cannot fit on mains power alone may run across an outage on the backup, up to the hours she set, in the earliest unbroken stretch that can hold it. Backup is spent in the same order as the jobs are placed, so must-do jobs get it first. The plan says when to switch ("On backup 20:00–20:45").
- A job that does not fit is listed with its reason. With no backup: "Needs 5 h in one go; the longest powered stretch left is 4 h 15 min." A job that could run on backup says so: "This job can run on backup. Set your backup hours to try it." With backup set but still not enough: "Needs 5 h in one go. Even with 30 min of backup left, the longest run you can cover is 4 h 45 min."
- Once a plan has been made, it updates by itself as the area, backup or jobs change, and the change is announced to screen readers.
- Acceptance (the sample notice, Riverside East, the sample jobs, a plan for today):
  - [ ] With no backup: Sew the choir order 09:00–10:30, Pump water to the tank 10:30–11:30, Charge phones and the power bank 11:30–12:30 and Iron school uniforms 15:00–15:45. Slow-cook the beans is under Didn't fit with "Needs 5 h in one go; the longest powered stretch left is 4 h 15 min. This job can run on backup. Set your backup hours to try it."
  - [ ] With 1 hour or more of backup: the same four jobs, and Slow-cook the beans 15:45–20:45 with "On backup 20:00–20:45", and nothing under Didn't fit.
  - [ ] No block on the timeline touches a grey outage band except a time marked as backup, and backup time never exceeds the hours set.

### Right now
- For a plan for today, a card at the top of the plan says whether the power is on or off and until when, what is running now (and whether it is on backup), and what comes next with its time. Before the day starts or after it ends it says so.
- A page address ending in `?now=14:20` sets the clock for demonstrations; the card then says "Clock set to 14:20".
- Acceptance:
  - [ ] At 13:30 with the sample plan and 1 hour of backup: "Power is off until 15:00" and "Next: Iron school uniforms at 15:00".
  - [ ] At 20:30: "Power is off until 23:00", "On backup: Slow-cook the beans until 20:45" and "Nothing more is planned today".
  - [ ] At 08:00: "Power is off until 09:00" and "Next: Sew the choir order at 09:00".

### Works with no power and no network
- The page can be added to a phone's home screen and, after one visit online, opens with no network.
- The household (jobs, area, backup, day, last notice and its areas) is saved in the browser on this device only, and restored on the next visit. A Forget this device button removes it.
- A small pill in the masthead says "Offline: your plan is saved on this device" when there is no network.
- Acceptance:
  - [ ] After one visit, with the network switched off, reloading the page shows the same plan and Right now.
  - [ ] Forget this device returns the page to its first-visit state.
  - [ ] A reviewer who has never visited the page can still use everything except photo reading with no AI configured.

### Sharing the plan
- Plan picture: opens a dialog with an image of the plan (title, area, the ribbon, each job with its times, anything that did not fit) with Share (where the browser can share files) and Download.
- Add to calendar: downloads an `.ics` file with one event per placed job and per outage, each with a reminder ten minutes before ("Power goes off in 10 minutes").
- Copy plan: puts a plain-text message on the clipboard, or shows it selected when the browser blocks copying.
- Acceptance:
  - [ ] The picture shows the same jobs and times as the plan, in readable type at 1,080 px wide.
  - [ ] The calendar file imports with the right times on the chosen day.
  - [ ] Pressing Copy plan shows "Copied" and the clipboard holds the text.

## States and Boundaries
- **First visit** — the example day, the three ways in, the sample jobs listed, and the plan area explaining what will appear.
- **Reading** — the photo shows with a moving highlight and the buttons are paused; the page announces "Reading the photo…" or, for text, "Reading the notice…".
- **Nothing found** — "No outage times found. Check the notice has times like 05:00–09:00." and the text is kept.
- **AI unavailable** — the rules take over for text, and the note says so. A photo says it needs the AI reader.
- **No outages for the area** — the whole day is powered; the plan still runs.
- **Offline** — the masthead pill appears, photo reading is paused, everything else works.
- **Returning** — the saved household is restored and the plan is drawn again at once.
- **Privacy** — the photo goes to the AI reader and is not kept. Everything else stays in this browser. Nothing is sent for analytics.

## Product Decisions
- The AI only reads; ordinary code places the jobs. A plan must be checkable and the same every time. (Carried from version 1.)
- A job is never split across two powered stretches, because the jobs that matter most (ironing, baking, a sewing order) cannot pause. A job on backup bridges an outage but is still one unbroken job.
- Backup is one number, the hours it runs in a day, not watts: it keeps the planner honest and the screen simple.
- Phones first: the design is made at 390 px and enlarged, not the other way round.
- Browser storage, not accounts: the household belongs on the device it lives on.
- Calendar reminders instead of notifications: they work with no account and no server.
- Yellow means power is on, olive means backup, blue means act. Colour carries meaning, so it is not used for decoration.

## What We're Building
Reading a notice from a photo or text (AI, then rules), choosing an area, setting backup hours, the jobs list with plain-word entry, planning the day with backup and reasons for misses, the ribbon and timeline, Right now, installable offline use with a saved household, and the three ways to share the plan.

## Deferred From the POC
- Several days in one notice: the plan is for one day.
- Showing what moved when a notice is revised: it needs its own comparison screen.
- A changeable day start and end.
- Pausable jobs: a job that can stop and restart changes what "fits" means.

## Possible Later Enhancements
- A comparison of two notices ("what moved, and why").
- Reading jobs from speech, once it can work with no network.
- Sending the plan straight into a chat app.

## Non-Goals
- No accounts, no sign-in, no stored personal data on any server.
- No live feed from any utility.
- No push notifications or messages sent for the user.
- No power or watt calculations.

## Open Questions
None blocking the spec.
