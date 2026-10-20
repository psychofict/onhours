# Judge simulation

Three AI reviewers, each a separate sub-agent that had never seen the project, read the entry the way a Devpost judge would and scored it against the four official criteria (Design, Potential Impact, Innovation/Idea, Presentation). Each got the same brief, a different background (a developer marketing manager, a learning-hackathon architect, a head of project management), the video as frames plus its caption file, the Devpost text, the gallery images and the repository. They could run `node --test` and nothing else. They were told to be strict: a 10 is one of the best entries of 4,305, a 5 is competent but unremarkable.

These are not predictions of the real score. They are a way to find what a cold reader trips on. Two limits matter: the reviewers cannot hear the narration (they read its captions), and they are the same kind of model that helped build the entry, so they can share its blind spots. The judges' own words are quoted below; the fixes are ours.

## Round 1: the first finished version 2 (20 October 2026)

| Criterion | Reviewer A (marketing) | Reviewer B (architect) | Reviewer C (project management) |
| --- | --- | --- | --- |
| Stage 1 (fits the theme, built with the pack) | Pass | Pass | Pass |
| Design | 8 | 8 | 8 |
| Potential Impact | 6 | 6 | 6 |
| Innovation/Idea | 5 | 6 | 6 |
| Presentation | 8 | 8 | 8 |
| Top three of the field? | Probably not | Probably not | Borderline |

What they said, in short:

- All three called Design and Presentation top-tier for the field and the planning documents a clear driver of the build (66 of 66 tests passed when they ran them).
- All three named the same weak point: everything is shown on one invented, clean notice, and there is no sign that a real person has used it. Reviewer A: "The proof is staged." Reviewer B: "There is no evidence that a real person needs or has used this." Reviewer C: nothing "proves it holds up on a real, messy notice or with a real person".
- Two of three asked for the same remedy: show a second, uglier notice (tilted, a different layout) read live.
- The idea scored lowest. Reviewer B: "a modest extension of existing outage apps"; Reviewer C: "constraint scheduling and that split are familiar".

Things they saw that were wrong or confusing, and what we did:

| What they saw | Who | What we did |
| --- | --- | --- |
| The "Try 1 hour of backup" button sat inside the wrapped sentence (video about 0:50, gallery 04) | A, B, C | The button now sits on its own line under the reason (`styles.css`) |
| The app appears while the caption still talks about the chat; "Choose yours" lands after the area was picked | A, B | The film is now timed from the narration: every on-screen action is placed against the spoken line it belongs to (`tools/video/segments.cjs`) |
| The plan area flashes blank while it redraws (about 1:06) | A, C | A plan redrawn because the backup or jobs changed now animates only its bars; the whole plan draws in only for a new area or day |
| The demo clock was 13:30, so jobs from 09:00 sat in the plan with no "done" state; "Clock set to 13:30" was never explained | B, C | Jobs that have already ended carry a Done tag; the demo clock is now 08:00, the film says so on screen, and "Right now" reads "Power is off until 09:00" |
| Airplane mode was only a status-bar icon; the toggle was never seen | B | A drawn quick-settings panel switches airplane mode on before the reload |
| The home-screen scene was mostly blank and did not show installing | A | Rebuilt: an Add to home screen prompt, the icon appearing among app tiles, a tap, and the app opening onto its real first screen |
| The beans on backup (20:00 to 20:45) were cropped at the bottom of the zoomed pane | B | The plan panel now scrolls far enough to show the whole row |
| Text inside the phone frame was very small | B | The phone is 12% larger on the stage |
| The "Plan picture" label wrapped onto two lines | C | The share buttons now sit two across on a phone |
| A caption covered "Five slices, each tested before the next" | C | The drawn scenes now keep clear of the caption band, and the line reads "Six slices" |
| The Ebenworks paragraph in the Devpost text was off-topic | B | Moved to a short "About us" at the end |
| The Ikeja Electric fact did not show that notices arrive as pictures | C | The text now says "when that timetable is passed around as a picture", and the film's audience scene carries the Ikeja line with its source |
| "In many cities the schedule only ever arrives as a message" | (ours) | Now "Wherever the schedule arrives as a message" in the narration, because we cannot show that it always does |

What we did about the two big findings:

- The idea: three reviewers asked, in different words, for the plan to react when the notice changes. That was cut in the first plan because it seemed to need its own screen. It does not: it compares two plans the planner has already made. It is now slice 6 (`devpost/checklist.md`), with `diffPlans()` in `public/planner.js`, a card above Right now, tests, and a beat in the film (the iron moves to 16:00 and the beans stop fitting, each with its reason).
- A messy notice: a second sample photo (tilted, a different layout, times in words such as "4pm-6:30pm, then 11pm till 1am", an overnight cut and a zone with no cut) is now read live in the film. It gives five areas with the right times in the live reader.

What we could not fix: real-user evidence. Nobody outside the team has used OnHours, and we will not invent a quote, a tester or a number. The Devpost text and the film now say so plainly and name the next step (ask a tailor or a baker to plan a day from the notice they actually received).

## Round 2: the rebuilt film (21 October 2026)

The same three reviewers were run again from scratch (new sub-agents, the same brief and roles, told nothing about what had changed) on the rebuilt film, gallery and repository.

| Criterion | Reviewer A (marketing) | Reviewer B (architect) | Reviewer C (project management) | Average, round 1 to round 2 |
| --- | --- | --- | --- | --- |
| Stage 1 | Pass | Pass | Pass | |
| Design | 8 | 8 | 8 | 8.0 to 8.0 |
| Potential Impact | 6 | 5 | 6 | 6.0 to 5.7 |
| Innovation/Idea | 6 | 6 | 6 | 5.7 to 6.0 |
| Presentation | 8 | 8 | 7 | 8.0 to 7.7 |
| Top three of the field? | No | Probably not | Probably not | Borderline to probably not |

The scores did not improve. Innovation went up a third of a point (reviewer C called "what moved, and why" "the freshest part"), and Impact and Presentation each went down a third. The one finding that caps the whole entry is the same in all three reviews of both rounds. Reviewer B: "Impact is asserted but not evidenced. The one change that would raise the score most is a real test with one real tailor or baker." Reviewer A: "one real tailor, baker or pump household using their own notice." That has to be done by a person with a real household. We have not done it and have not written around it.

What they found in round 2, and what we did about it. The fixes below were made after the second round and have not been judged again.

| What they saw | Who | What we did |
| --- | --- | --- |
| The first 1.5 seconds were an empty, silent chat | A, C | The lead-in is 0.7 s and the first chat message appears at once |
| Captions sat over the phone's message bar | A | In the phone scenes the captions now sit in the panel beside the phone |
| Text in the laptop scenes ("Didn't fit", "what moved") was small | B, C | The laptop shots are recorded in a narrower window, so the page's text is 16% larger. That showed a real bug: the "Add to calendar" label wrapped onto two lines at about 1100 px. Fixed in `styles.css` and checked from 390 to 1440 px |
| "A reminder ten minutes before every cut" undersold the calendar file, which also covers every job | C | The line was retaken: "every job and every cut" |
| The Devpost text said the planning documents were amended before the slice-6 code, but the git history shows the code first | B | Right, and corrected in `devpost-text.md` and `PROGRESS.md`: the documents followed the code, in the next commit |
| All 28 acceptance boxes in the requirements were unticked although the slices were done | B | `tools/check-acceptance.cjs` tests every line against the real page (AI reader on, off, failing, offline); all pass and the boxes are ticked |
| Playwright logs were committed under `tools/icons/` | B | Removed and ignored |
| The airplane-mode panel is drawn but was not listed as drawn; the 08:00 demo clock was small print | B | Both are now in the Devpost text, and the film says the clock on screen |
| The Ikeja line was tiny and on screen briefly | B | Larger type |
| Who it is for arrived at 2:02 | C | It is now also on screen from the first second, beside the chat |
| The end card held on one frame | A | A slow drift down the first screen |
| The lower third of gallery image 4 was empty | A | A sentence under each half |
| `devpost-text.md` cites `JUDGE-SIMULATION.md`, which was not tracked | A, C | It is committed with this change |

Not changed, with the reason:

- The product first appears at about 0:13 and "who it is for" gets its own scene at about 2:03. Moving either would cut the demo or the problem statement, and the first is the stronger.
- The film jumps from the messy photo back to the clean sample day without saying so (A). The messy notice is read, not planned; the film now says "reads five areas" and nothing more.
- "Take a photo" is shown with a sample photo, never a camera (C). A real camera shot needs a real notice and a real person.
- Photo reading cannot be reproduced from a clean checkout without a model endpoint (C). `README.md` says so; it works with any OpenAI-compatible endpoint.
- No hosted link to try (C, and the rules do not ask for one). A hosted copy would expose a paid model.
- The "Final review complete" box in `devpost/checklist.md` is left for a person, on purpose.
