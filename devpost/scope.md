---
doc: scope
status: approved
---

# OnHours

Paste the power-cut notice, list the jobs that need electricity, and get a day plan that fits every job into the hours the power is on.

## The Unique Kernel
OnHours plans around the outage, not around the clock. A job that needs 90 minutes of power is only placed in a stretch of at least 90 unbroken powered minutes, and when a job cannot fit, the app says why in one line. The notice people already share (a forwarded message, often messy) is the input, so there is nothing to set up.

## Who It's For
Thandi runs a household of five and a small sewing business from home in a city with scheduled power cuts. Every few days the area's outage schedule arrives as a forwarded message in the street's group chat. Today she reads it, works out her area's hours in her head, and then juggles the water pump, the iron, the sewing machine and charging the family's phones around them. Something always gets missed, usually because it was started too late and the power went off halfway through.

## The Core Loop
She opens OnHours, pastes the notice she was sent, picks her area, adds or keeps her usual jobs (how long each needs, which must happen today), and taps Plan my day. She sees the day as a timeline with the powered hours, each job placed in one of them, and a short list of anything that did not fit. She copies the plan as text into the family chat. She comes back whenever a new notice arrives.

## Inspiration & Identity
Calm and practical, like a well-made paper planner on a kitchen table: warm off-white paper, ink-dark type, and a sunlight yellow that marks when the power is on. Editorial serif for headings, a clean sans for everything you tap. No dashboards, no dark mode, no alarm-red. Reference for tone: the clarity of a printed train timetable.

## Why This Matters to the Learner
Ebenworks builds AI for the people who keep daily life running, and power cuts shape the day for millions of them. This is a small, honest test of that idea: can a pasted message become a plan someone would actually follow?

## What "Working" Looks Like
Open the page, press Use the sample notice, press Read the notice, pick Riverside East, keep the sample jobs, press Plan my day. The timeline shows the area's three outages, each job sits inside a powered stretch long enough for it, and must-do jobs are placed first. The "oh, that's cool" beat: a job too long for any powered stretch is listed with the reason ("needs 5 h 30 min in one go; the longest powered stretch left is 2 h 15 min"), and Copy plan gives a message ready for the family chat.

## The POC Boundary
- One page that runs locally.
- Read a pasted notice into areas and their outage times: with an AI model when one is configured, otherwise with built-in rules for the common formats.
- Pick one area, edit a short list of jobs (name, how long, must-do or not).
- Plan one day: place each job in a powered stretch long enough for it, must-do jobs first.
- Show the timeline, the placed jobs and the jobs that did not fit with a reason.
- Copy the plan as plain text.

## Later
- Several days at once when a notice covers a week.
- Remembering the household's usual jobs between visits.
- Splitting a job that can pause (charging) across two powered stretches.
- Reading a photo or screenshot of the notice.
- Sharing straight to a chat app.

## Explicitly Cut
- Accounts and sign-in: nothing here needs to know who you are.
- Live outage feeds from utilities: they differ by country and often do not exist; the forwarded notice is what people actually have.
- Push reminders before the power goes off: needs a phone app and permission flows, far beyond a proof of concept.
- Appliance power budgets (watts, inverter sizing): a different product.
