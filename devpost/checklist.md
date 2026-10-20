---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

Version 2 of OnHours. Version 1's three slices (a pasted notice becomes a day plan; the AI reader; the jobs editor and Copy plan) are in the git history up to commit `f82198a`; they are done and this list builds on them.

## Slices

- [x] **1. The planner carries a job across an outage on backup**
  Becomes usable: Set the backup hours, mark a job Runs on backup, and the sample day shows the slow-cooked beans placed with "On backup 20:00–20:45" instead of under Didn't fit. Text notices are read by rules that now live in the page's own folder.
  Why now: This is the new idea inside the kernel, and it is plain, testable code. Everything visual in the later slices draws what the planner returns, so its output shape has to be settled first.
  PRD ref: `prd.md > Planning the day`, `prd.md > Choosing the area and the backup`, `prd.md > The jobs list`
  Spec ref: `spec.md > Planner (public/planner.js)`, `spec.md > Rules reader (public/rules.js)`, `spec.md > Data Model`
  Build: Add backup bridging and the `onBackup` spans to `planDay()`, with the new reasons for jobs that do not fit. Move `rules.js` into `public/` and point the server at it. Write the version 2 sample jobs. Add the backup stepper and the Runs on backup switch to the existing page so the behavior can be tried at once.
  Verify (mechanical): `node --test` passes the new planner tests (the sample day with no backup and with 1 hour, no overlaps, backup never over budget, the same plan twice) and the moved rules tests; the page in a headless browser shows the beans under Didn't fit with no backup and placed with "On backup 20:00–20:45" at 1 hour.
  Learner check: Open the page, use the sample notice, choose Riverside East, plan, then set the backup to 1 hour and see the beans move from Didn't fit into the day.
  Commit: `Carry a job across an outage on backup power`

- [x] **2. A phone-first redesign with the day ribbon, Right now and plain-words jobs**
  Becomes usable: The whole flow looks and works like a finished app at 390 px and 1280 px: an opening that shows an example day, the notice, area and backup, jobs, and the plan with a day ribbon, a timeline, a Right now card and honest empty, loading and error states. Jobs can be typed in plain words.
  Why now: Design decides ties and the video is built from this screen, so the look is settled before the remaining features add to it.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > Right now`, `prd.md > The jobs list`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Page (public/index.html, public/app.js, public/draw.js, public/jobs.js, public/styles.css)`, `spec.md > Right now (public/now.js)`, `spec.md > Plain-words jobs (public/jobtext.js)`, `spec.md > Look and Feel`
  Build: Rewrite the page structure and styles to the Oura-based system with Newsreader and Geist; add `draw.js`, `now.js` and `jobtext.js`; add the `?now=` demo clock, live re-planning after the first plan, keyboard and screen-reader support, and the Right now card.
  Verify (mechanical): `node --test` passes the tests for `nowStatus` (08:00, 13:30, 20:30) and `parseJobs`; screenshots at 1280 and 390 px of the first visit and the planned sample day are opened and read; a keyboard-only pass reaches every control; no console errors; the computed background is light everywhere.
  Learner check: Open the page on a phone-sized window, run the sample, and say whether the day reads at a glance and whether Right now answers "what do I do next?".
  Commit: `Rebuild the page phone-first with a day ribbon and a Right now card`

- [x] **3. A photo of the notice becomes the plan**
  Becomes usable: Choose the sample photo (or any photo of a notice) and the page reads its areas and outage times; with no AI, or on a failure, the page says so plainly and the Text tab still works.
  Why now: It is the riskiest outside dependency, and the opening of the demo, so it is proved against the real gateway once the page that shows it exists.
  PRD ref: `prd.md > Reading the notice`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Notice reader (server/read-notice.js)`, `spec.md > Server (server/index.js)`, `spec.md > External Services and Dependencies`
  Build: `readNoticeImage()` with the vision prompt, the reply check and the transcript fallback; the image route with its size limit; `public/photo.js`; the Photo tab with preview, reading state and errors; the sample photo.
  Verify (mechanical): unit tests with a stub model (good reply, bad reply with a usable transcript, bad reply with none, image too large, model off); one live read of the sample photo through the company gateway returns the six areas with Riverside East's three outages; the key never appears in a response, the page or the log.
  Learner check: Press Use the sample photo and watch the six areas appear, then pick Riverside East.
  Commit: `Read a photo of the notice with a vision model, the rules as backup`

- [ ] **4. The page keeps working with no power and no network**
  Becomes usable: After one visit, add the page to a phone's home screen, stop the server, switch the network off and reload: the household and the plan are still there, text can still be read, and a pill says the page is offline.
  Why now: It is the claim the product is named for, and the part most likely to behave differently in a real browser than in tests.
  PRD ref: `prd.md > Works with no power and no network`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Saved household (public/store.js)`, `spec.md > Offline layer (public/sw.js, public/manifest.webmanifest, public/icons/)`, `spec.md > Data Model`
  Build: `store.js`, the offline pill and Forget this device, the service worker, the manifest and icons, rules reading in the page.
  Verify (mechanical): store tests; in a headless browser, load the page, wait for the service worker, switch the network off, reload, and confirm the plan and Right now draw with no failed requests for the page's files; Lighthouse accessibility, best practices and SEO at or above 90.
  Learner check: Plan the sample day, switch on airplane mode, reload the page, and see the same plan.
  Commit: `Keep the page working offline and remember the household on this device`

- [ ] **5. The plan leaves the app as a picture and a calendar file**
  Becomes usable: From a finished plan, open a plan picture to share or download, and download a calendar file whose events and ten-minute reminders match the plan.
  Why now: It closes the loop with the family chat, which is where the notice came from, and it is the last feature the video shows.
  PRD ref: `prd.md > Sharing the plan`
  Spec ref: `spec.md > Sharing (public/share.js, public/card.js, public/ics.js)`
  Build: `card.js` (canvas drawing), the dialog in `share.js`, `ics.js` with the alarms, and the buttons on the plan.
  Verify (mechanical): `ics.js` tests (times, escaping, alarms, the chosen day); in a headless browser the dialog opens, the picture's pixel size is 1,080 x 1,350, and the downloaded file parses; the picture is opened and read.
  Learner check: Press Plan picture, check the jobs and times against the plan, then Add to calendar and see the file's events.
  Commit: `Share the plan as a picture and a calendar file`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2, the sample day at 1280 and 390 px. Headless pass by the build session: first visit and the planned sample day at both widths, a keyboard-only tab pass (46 stops, every control reachable and focus-visible), no console errors, no horizontal overflow, light background. Feedback acted on: the clock marker crossed the job names, so it now sits inside each track and on the hour axis; class names `job` and `backup` collided between the cards and the legend swatches, so the swatches were renamed; the plan placeholder showed beside the plan until `[hidden]` was made absolute.
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — focused alternative: follow one job from the jobs list to the timeline, through `planDay()`
- [ ] Optional edit and transfer reflection addressed — not applicable to this build session
- [ ] `devpost/app-map.html` regenerated from the version 2 code, checked, and shown

Activity and evidence: to be filled in when the build is finished.
Route and stops: to be filled in when the build is finished.
Edit outcome: not applicable.
Reflection: not applicable.
Activity mode: focused alternative.

## Revisions

- Slice 1 placed jobs by a plain earliest-start rule and no search: an arrangement search was considered, to let backup rescue a job by reordering the others, and dropped because the sample day needed none and a fixed rule is easier to check and to explain on screen.
- The planner scans every minute for the earliest start, not a five-minute grid, so jobs begin exactly when the job before ends or an outage ends; `spec.md > Planner` says so.
- Slice 3: the first live photo reads through the company gateway returned all six areas in about 3 seconds. Eight reads of the sample photo in a row were all six areas right (2.6 to 3.4 seconds each) once the prompt put "areas" before "transcript" and told the model to use single spaces. Before that change one read in four ran 17 seconds and came back cut off, because the model filled its transcript with endless padding spaces; the page now also takes the finished areas out of a cut-off reply and checks them like any other. A rotated, noisy copy of the photo gave the right times for all six areas in three reads but one name misread as "Kopie Heights" every time, which is why the page tells the person to check the names against the notice. A screenshot of the app itself gave no areas, and the first version of the fallback then read its transcript and invented one, so a reply that passes the check as "no outage times" is now trusted and never re-read by the rules.
