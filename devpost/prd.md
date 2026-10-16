---
doc: prd
status: approved
---

# OnHours — Product Requirements

A one-page planner for a household or home workshop living with scheduled power cuts: paste the outage notice, list the jobs that need power, get a day plan that fits each job into an unbroken powered stretch.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. Thandi opens OnHours. She sees the headline "Plan your day around the power cuts.", a large box to paste the notice, and her list of jobs underneath. (`scope.md > The Core Loop`)
2. She pastes the notice from the group chat, or presses Use the sample notice to try it with the built-in example.
3. She presses Read the notice. Within a few seconds a list of areas appears, each with its outage times, and a note says how it was read: "Read by AI" or "Read by built-in rules".
4. She picks her area. Its outage times show beside it ("Off 05:00–09:00, 13:00–15:00, 20:00–23:00") so she can check them against the message.
5. She looks at the jobs list: each job has a name, how long it needs and a Must do today switch. She edits, adds or removes jobs.
6. She presses Plan my day.
7. The timeline for 05:00 to 23:00 appears: outages as hatched grey bands, powered hours in sunlight yellow, each placed job as a labelled block inside a powered stretch.
8. Under the timeline, the plan reads as a list in time order ("09:00–12:00 Sew the choir order"), followed by "Didn't fit" with one line of reason per job.
9. She presses Copy plan and pastes the text into the family chat.

## Screens and Layout
One page, two columns on a laptop (inputs left, plan right), one column on a phone (inputs first, plan below). No other screens.

## Look and Feel
Carried from `scope.md > Inspiration & Identity`. Light, warm off-white page; near-black ink text; sunlight yellow for powered time and for the main button; outages as a soft grey hatch, never red. Headings in an editorial serif (Newsreader), everything else in a clean sans (Inter). Generous spacing, large tap targets, no dark areas, no dark mode.

## Features and Behavior

### Reading the notice
- Accepts any pasted text up to 8,000 characters.
- Finds every area named in the notice and its outage times for the day. When a line names several areas ("Group 2 – Riverside East, Siding Road"), each area appears on its own.
- When an AI model is configured, the AI reads the notice, which handles loose wording ("off from 4 in the afternoon until 8pm"). Otherwise built-in rules read the common formats (05:00-09:00, 5am to 9am, 17h00–21h00).
- Shows which reader was used.
- Acceptance:
  - [ ] The sample notice gives at least the six named areas, with Riverside East off 05:00–09:00, 13:00–15:00 and 20:00–23:00.
  - [ ] With no AI configured, the note says "Read by built-in rules" and the tidy lines still read correctly.
  - [ ] If the AI fails or answers badly, the built-in rules are used and the note says so.

### Choosing the area
- A list of the areas found; choosing one shows its outage times in plain words.
- Acceptance:
  - [ ] Choosing Riverside East shows "Off 05:00–09:00, 13:00–15:00, 20:00–23:00".

### The jobs list
- Starts with six example jobs (the sample household). Each job: name, hours and minutes, Must do today switch, remove button. An Add a job button adds an empty row.
- Acceptance:
  - [ ] Adding, editing and removing a job changes the next plan.
  - [ ] A job with no name or no time is skipped with a short note.

### Planning the day
- The day runs from 05:00 to 23:00.
- Powered stretches are the parts of the day outside the area's outages.
- Must-do jobs are placed first, then the rest; within each group, longer jobs first. Each job goes in the earliest free part of a powered stretch that can hold the whole job in one go. Jobs never overlap and never cross an outage.
- A job that does not fit is listed with its reason: "Needs 5 h 30 min in one go; the longest powered stretch left is 2 h 15 min."
- Acceptance (sample notice, Riverside East, sample jobs):
  - [ ] Sew the choir order 09:00–12:00, Pump water to the tank 12:00–13:00, Charge phones and the power bank 15:00–17:00, Iron school uniforms 17:00–17:45, Bake bread for the stall 17:45–19:15.
  - [ ] Slow-cook the beans is under Didn't fit with the reason above.
  - [ ] No block on the timeline touches a grey outage band.

### Sharing the plan
- Copy plan puts a plain-text message on the clipboard: a title line with the area, one line per job in time order, the outages, and the jobs that did not fit.
- Acceptance:
  - [ ] Pressing Copy plan shows "Copied" and the clipboard holds the text.

## States and Boundaries
- **First visit** — empty notice box with a short hint and the Use the sample notice button; the six sample jobs are listed; the plan area explains what will appear.
- **Nothing found** — if no area or time is found, the app says "No outage times found. Check the notice has times like 05:00–09:00." and keeps the text.
- **AI unavailable** — the built-in rules take over; the note says "AI reader unavailable, read by built-in rules".
- **No outages for the area** — the whole day is powered; the plan still runs.
- **Nothing persists** — refreshing the page starts again. Nothing is stored anywhere.

## Product Decisions
- The AI only reads the notice; ordinary code places the jobs. The plan must be checkable and the same every time.
- A job is never split across two powered stretches in this version, because the jobs that matter most (ironing, baking, a sewing order) cannot pause.
- Fixed day of 05:00 to 23:00, to keep the first version to one choice: the area.

## What We're Building
Reading the notice (AI or rules), choosing an area, the jobs list, planning the day with reasons for misses, the timeline, and Copy plan.

## Deferred From the POC
- Saving the jobs list: needs storage and a way to come back to it.
- Several days in one notice: the plan is for one day.
- A changeable day start and end.

## Possible Later Enhancements
- Reading a photo of the notice.
- Jobs that can pause and resume (charging) split across stretches.
- Sending the plan straight to a chat app.

## Non-Goals
- No accounts, no sign-in, no stored personal data.
- No live feed from any utility.
- No reminders or notifications.

## Open Questions
None blocking the spec.
