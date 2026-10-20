# Progress

## 16 October 2026

Started from an empty folder with the Devpost Learn skill pack (`npx skills add challengepost/learn-ai-basics --all -y`) and worked through it in order.

- Planning: `devpost/scope.md`, `devpost/prd.md` and `devpost/spec.md` written and approved, then `devpost/checklist.md` with three build slices.
- Slice 1, a pasted notice becomes a planned day: the planner, the built-in notice reader, the server and the page. The first two planned slices were merged; the reason is under Revisions in the checklist.
- Slice 2, the AI reader: an OpenAI-compatible model reads loose wording, every reply is checked, and the built-in rules take over on any failure. Checked live with a small model: the sample notice read in 1.5 s with all six areas right.
- Slice 3, the jobs editor and Copy plan.
- Checked at 1280 and 390 pixels wide in a headless browser: the sample journey places five jobs and lists one that does not fit, Copy plan copies the text, no console errors, light background.
- `node --test`: 16 tests pass.

- Final review: another area (Kopje Heights), an empty job row (listed as skipped) and a blocked clipboard (the plan shows selected for copying by hand) all behave as the PRD says. `devpost/app-map.html` written and checked with scripts off.
- Demo video: `submission/onhours-demo.mp4`, 80 seconds, 1280 x 800, recorded with the AI reader on. Draft submission text: `submission/devpost-text.md`.

## 17 October 2026

- Demo video on YouTube (version 1, 80 seconds): https://youtu.be/JEv8nrvxmA4. The version 2 film, `submission/onhours-demo-v2.mp4`, is not uploaded yet.

## 18 October 2026

- Added the MIT `LICENSE` the hackathon rules ask for, filled the repository and video links in `submission/devpost-text.md`, and published the repository at https://github.com/psychofict/onhours.


## 20 October 2026: version 2

Plan first again, with the Devpost Learn skills: `devpost/UPGRADE-PLAN.md`, then new `scope.md`, `prd.md`, `spec.md` and `checklist.md` (five slices). Version 1 stays in the git history.

- Slice 1, backup power: `planDay()` can carry a job marked Runs on backup across an outage, up to the hours set, and says when to switch. The built-in notice rules moved to `public/` so the page can use them. The sample day: with no backup the beans do not fit (4 h 15 min is the longest stretch); with 1 hour of backup they run 15:45 to 20:45, on backup 20:00 to 20:45. `node --test`: 22 tests pass, including 300 random days that check no overlaps, no mains job in an outage, and backup within budget.
- Slice 2, the phone-first rebuild: new page structure and styles after Oura's design language (warm paper, Newsreader and Geist, mustard for power, olive for backup, one blue for actions), a day chart where every job is a bar inside the yellow, a Right now card (with a `?now=14:20` demo clock), plain-words job entry, backup stepper, today or tomorrow, and states for reading, empty and error. Inter was replaced by Geist. Checked at 390 and 1280 px.
- Slice 3, a photo of the notice: `POST /api/read-notice` takes a shrunk photo, a vision model returns areas and a transcript, the same reply check applies, and a bad areas list falls back to the rules on the transcript. Live through the company gateway: 8 of 8 reads of the sample photo gave all six areas right in 2.6 to 3.4 seconds. `node --test`: 51 pass.
- Slice 4, with no power and no network: the household (jobs, area, backup, last notice) is saved in browser storage only, a service worker keeps the page's own files, the manifest and icons let it be added to a home screen, and text is read by the same rules in the page. Checked in a headless browser with the network switched off and the page reloaded: the plan, the area and Right now come back.
- Slice 5, share: the plan as a 1,080 x 1,350 picture (share or download), a calendar file with a reminder ten minutes before every job and every cut, and Copy plan. `node --test`: 65 pass.
- Audit and checks on 20 October 2026: Lighthouse accessibility, best practices, SEO and agentic browsing all 100 on a phone and on a laptop (navigation mode, local server), and 100 in the planned state (snapshot mode); LCP 83 ms and CLS 0.00 in a performance trace. The first audit found 97 (a list whose items had a role on them) and a layout shift of 0.47 (the opening example drew in late); both fixed. `tools/check-journey.cjs` walks the whole journey at 1280 and 390 px (photo, area, plain-words job, plan, backup, picture, calendar file, offline reload, forget) and passes every check.
- Demo video: `submission/onhours-demo-v2.mp4`, 2:18.9, 1920 x 1080, narrated by Murf (Natalie, Narration) with burned-in captions and `onhours-demo-v2.srt`; -16.1 LUFS, true peak -1.4 dBFS. Every picture of the product is the real app, recorded by script (`tools/video/`, commands in `submission/BUILD-VIDEO.md`). The v1 video is unchanged.
- Gallery: six 1800 x 1200 images in `submission/gallery/`, made from real screenshots (`tools/gallery/`). Devpost text rewritten in `submission/devpost-text.md`; README rewritten.

## 21 October 2026: review, slice 6 and the film again

Three simulated judges read the finished version 2 (`submission/JUDGE-SIMULATION.md`). They agreed it looked finished, scored the idea and the case for impact lowest, and asked to see a messy notice read live and a revised notice handled.

- Slice 6, a revised notice shows what moved and why: `diffPlans()` in `public/planner.js` compares two plans made from the same jobs, and a card above Right now lists each job that moved or no longer fits with the reason. With 1 hour of backup, the revised sample notice moves the iron from 15:00 to 16:00 and the beans stop fitting. Three new planner tests; `node --test`: 69 pass. `scope.md`, `prd.md`, `spec.md` and `checklist.md` were amended to match straight after the code (the code was committed first, and the documents in the next commit, not the same one).
- A second sample photo (tilted, a different layout, times in words, an overnight cut, a zone with no cut) is read by the same reader: five areas with the right times. A Done tag marks jobs that have already ended on today's plan; a plan redrawn for a backup or job change animates only its bars; the sample buttons and share buttons lay out cleanly at 390 px.
- Checks: `tools/check-journey.cjs` passes at 1280 and 390 px including the revised notice. Lighthouse accessibility, best practices, SEO and agentic browsing are 100 on a phone and on a laptop, and 100 with the card on screen. First-visit CLS 0.007 and LCP 56 ms; 0.038 when a saved plan is restored.
- The film was rebuilt: `submission/onhours-demo-v2.mp4` is now 2:39.2 (was 2:18.9), with two new beats (the messy photo, the revised notice), an airplane-mode panel, a rebuilt home-screen scene, a demo clock of 08:00 stated on screen, a 12% larger phone, a larger laptop view, captions placed beside the phone, a shorter lead-in, and every action timed from the narration (`tools/video/segments.cjs`). -16.2 LUFS, true peak -1.3 dBFS. The gallery was remade at the same clock and now ends with a what-moved image.
- Written for the people who submit: `submission/RULES-CHECK.md` (every rule with evidence and what is left for a person) and `submission/UPGRADE-RESULT.md`.
- The comments and error message in `.github/workflows/no-direct-anthropic.yml` now refer to the company's model gateway in general words, without its address; the check itself is unchanged.
