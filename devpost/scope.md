---
doc: scope
status: approved
---

# OnHours

The power-cut day planner that still works when the power is out: photograph or paste the outage notice, list the jobs that need electricity, and get a day plan that fits every job into the hours the power is on.

Version 2. Version 1 (a pasted notice becomes a plan) is in the git history; this scope keeps its kernel and adds what a household needs on the day of a cut.

## The Unique Kernel
OnHours plans around the outage, not around the clock. A job that needs 90 minutes of power is only placed in 90 unbroken minutes the power is on, and a job that cannot fit says why in one line. The input is the notice people already have, a forwarded message or a photo of one, so there is nothing to set up. The AI only reads the notice; plain, tested code places every job, so the same notice and jobs always give the same plan.

Version 2 adds the idea that gives the product its point: the plan has to work in the one place a normal planner fails, a phone with no power and often no network. It is installed on the phone and runs offline.

## Who It's For
Thandi runs a household of five and a small sewing business from home, in a city with scheduled power cuts. The area's schedule arrives every few days as a forwarded picture in the street's group chat. Today she reads it, works out her area's hours in her head, and then juggles the water pump, the iron, the sewing machine and charging the family's phones around it. Something always gets missed, usually because it was started too late and the power went off halfway through. Some days her cousin lends her an inverter, and she has no easy way to know which job it would save.

## The Core Loop
She opens OnHours on her phone and takes a photo of the notice, or pastes its text. The app reads every area and its outage times; she picks hers and checks the times. Her usual jobs are already there from last time. She says how many hours her backup battery runs, if she has one, and presses Plan my day. She sees her day as a ribbon of powered and unpowered hours with each job placed inside a powered stretch, and a short list of what did not fit and why. In the middle of the cut she opens the app with no network and it tells her when the power returns and what comes next. She sends the plan to the family chat as a picture, or adds it to her calendar with reminders. She comes back whenever a new notice arrives.

## Inspiration & Identity
Calm and practical, like a well-made paper planner on a kitchen table, with the finish of a premium print magazine. The design reference is Oura's published design language: a warm paper canvas, a light high-contrast serif for the big statements, a quiet sans for everything read, earth tones for data, and one decisive action colour. Sunlight yellow means only "power is on"; olive means "running on backup"; blue means "press this". No dashboards, no dark mode, no alarm red. The tone of the words is plain and warm: second person, short, honest about what did not work.

## Why This Matters to the Learner
Ebenworks builds AI products for the people who keep the world running: the shop owner, the nurse, the family carer, the contractor, the organiser and the artist. Scheduled power cuts shape the day for millions of them. This is a small, honest test of that idea, and of building it plan first: can a photo of a message become a plan someone would actually follow, even in the dark?

## What "Working" Looks Like
Open OnHours on a phone and a laptop. Choose the sample photo of a notice and watch it become six areas with their outage times. Pick Riverside East, keep the sample jobs, and press Plan my day. The ribbon and timeline show each job in a powered stretch; the slow-cooked beans do not fit, with the reason in one line. Set the backup to 1 hour and the beans fit, with a note to switch to the inverter at 20:00. Switch the network off and reload: the plan is still there, with a "Right now" card saying when the power returns. Send the plan as a picture.

## The POC Boundary
- One installable page that runs from a Node server with no packages, and offline after the first visit.
- Read a notice from a photo (with an AI model that can see images) or from pasted text (with an AI model or with built-in rules, which also run on the phone).
- Pick one area, edit a short list of jobs (name, how long, must-do, can run on backup), set the backup hours.
- Plan one day, with backup bridging, and a plain reason for every job that does not fit.
- Show the day as a ribbon and timeline, and a Right now card for the moment of the cut.
- Remember the household on this device only: jobs, area, backup and the last notice.
- Share: copy as text, a plan picture, a calendar file with reminders.

## Later
- Several days at once when a notice covers a week.
- Showing what moved, and why, when a revised notice arrives.
- Splitting a job that can pause (charging) across two powered stretches.
- Reading jobs from speech.
- Sending the plan straight into a chat app.

## Explicitly Cut
- Accounts and sign-in: nothing here needs to know who you are, and the data stays on the device.
- Live outage feeds from utilities: they differ by country and often do not exist; the forwarded notice is what people have.
- Push notifications: they need a server that knows who you are. The calendar file gives reminders with no account.
- Appliance power budgets (watts, inverter sizing): a different product. Backup is one number, the hours it runs.
- Speech input: the browser's speech service needs the network, which is what this product avoids.
