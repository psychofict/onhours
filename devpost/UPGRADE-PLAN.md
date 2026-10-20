# OnHours version 2: upgrade plan

Written 20 October 2026, before any version 2 code. It records what was chosen, what was cut and why, and how the new video is built. The planning documents `scope.md`, `prd.md`, `spec.md` and `checklist.md` were rewritten from this plan with the Devpost Learn skills, and describe what is built.

## The decision

Version 1 works, but a judge who has watched forty "AI planner" videos sees a text box and a form. Version 2 is built around one sentence a judge can repeat: OnHours is the day planner that still works when the power is out. A photo of the notice goes in, a plan comes out, and the plan stays on the phone with the network off.

The video is one third of the score and decides the first impression, so the work is ordered video first, then the whole product flow (Design decides ties), then the new ideas. Every feature below has to be reliable and has to appear on screen. Anything that fails one of those two tests was cut.

## First principles

- Problem: in 20 seconds a judge must feel a problem, see it solved, and keep one image.
- Habit, not law: showing a form being filled in. Law: a judge only sees a screen and hears a voice for under three minutes.
- Habit, not law: making the AI the star. What the judge can believe is reliability, so the plan shows the AI reads and plain code places every job, and then shows the plan surviving airplane mode.
- Rebuild: lead with the sum people do in their head, put a working product on screen inside 25 seconds, and end on the phone with the network off.

## The criteria

The overview page lists three judging criteria. The official rules, section 6, list four, equally weighted: Design, Potential Impact, Innovation/Idea and Presentation, with ties broken in that order. Potential Impact asks for a credible, specific case that a real audience has the problem and that the demo solves it. The video and the page text therefore name who the planner is for and show the problem solved, and Design is treated as the tie-breaker it is.

## What already exists

Checked on 20 October 2026. The listing for ESP (EskomSePush) in the App Store describes live power, water and internet outages in your suburb reported by neighbours, with alerts ahead of a load shedding slot. The ZETDC Load Shedding app on Google Play (updated 20 May 2026) says it keeps you informed about load shedding schedules and power outages. Utilities keep publishing notices people have to read: Ikeja Electric's notice of early October 2026 (reported by Legit.ng on 4 October 2026) explains that Band A feeders missed the 20-hour minimum on 30 September and 1 October.

These apps tell you when the power is off. In the searches done for this plan, none took your own list of jobs and placed them into the powered gaps with a reason for each miss, and none read a photographed notice. That is a statement about what the searches found, not proof that no such app exists, and the public text says it that way.

## Design reference

Oura (its published design language, as captured in a local design reference library), taken as a whole system and kept in light surfaces only. A warm paper canvas (`#F7F1E8`) with white cards and hairline dividers. A light, high-contrast serif for the large statements (Newsreader, already shipped) and a quiet grotesque for everything read (Geist, SIL Open Font License, replacing Inter). An earth-tone family for data: the mustard ramp for powered time, the olive and sage ramp for backup power. One decisive action colour on buttons, the action blue `#2A72DE`, so yellow means only "power is on" and blue means "press this". Full pill buttons, 24 px card radius, nothing dark and filled. The family is Editorial Luxury.

## Upgrades chosen

1. A complete mobile-first redesign of the flow notice, area, jobs, plan, with a day ribbon you can read at a glance, a "Right now" card for the moment the power is out, honest empty, loading and error states, and keyboard and screen-reader access.
2. Works with the power out. The page installs on a phone (web app manifest), runs offline (service worker), keeps the household's jobs and last notice in browser storage only, and reads text notices on the phone with the same built-in rules the server uses.
3. A photo of the notice becomes the plan. A vision-capable model reads the image through an OpenAI-compatible endpoint, returns the usual areas and also a transcript. Every reply goes through the same check, and if the areas fail the check but a transcript exists, the built-in rules read the transcript. The model still only reads.
4. Backup power. Say how many hours your battery or inverter runs in a day and which jobs can run on it. The planner can then carry a job across an outage and tells you when to switch ("on backup 13:00 to 14:30"). It is plain code, tested, and gives the same plan every time.
5. Sharing that fits the story: the plan as a picture for the family chat, a calendar file with reminders, and the existing copy as text. Jobs can be typed in plain words ("iron 45 min, pump 1 h"), read by rules on the phone.

## Cut, and why

- Speech input: the browser speech service needs the network, which is the thing the product avoids.
- Re-plan with "what moved and why" when a notice changes: real, but it needs its own screen and about 20 seconds of video, and nothing else would give way.
- Reading jobs with the model: the rules cover the common phrasings offline; a model path would add a failure case for little gain.
- Several days, accounts, live utility feeds and push reminders stay cut for the reasons in `scope.md`.

## The video

Length 2:15 to 2:50, 1920 x 1080, narration by Murf (voice Natalie, style Narration), burned-in captions and a separate caption file, no music, no third-party logos. A drawn generic chat bubble stands in for any chat app. Every shot is the real app, driven by a script so the take can be repeated.

| Time | On screen | What it says |
| --- | --- | --- |
| 0:00 to 0:12 | A photo of a notice lands in a drawn group chat | The sum everyone does in their head |
| 0:12 to 0:40 | Photo read, area chosen, plan drawn | Works end to end, with the AI only reading |
| 0:40 to 1:10 | The plan up close, a job that does not fit and why | One unbroken stretch per job, honest misses |
| 1:10 to 1:35 | Backup power set, the plan changes | Switch to the inverter at 13:00 and it fits |
| 1:35 to 2:00 | The phone, "Right now", airplane mode, reload | The plan is still there with no network |
| 2:00 to 2:15 | Share picture and calendar file | Into the family chat in one tap |
| 2:15 to 2:40 | The finished plan | Who it is for, why it matters, what planning first taught |

## Risks

The photo reader depends on the company model gateway. It is checked live before filming, tests cover its reply check and fallback with a stubbed model, and the page says plainly when a photo cannot be read. The offline claim is checked with the browser's network switched off and a reload. Narration is checked against the script with Whisper and a second recogniser, and the product name is spelled for the voice as the Murf note advises.

## Addendum, 21 October 2026: what the first judge round changed

Three simulated judges read the finished entry (`submission/JUDGE-SIMULATION.md`). They agreed that the entry looked finished and that the idea scored lowest. The cut above, "what moved and why", was the piece they named as missing, so it is now built (`checklist.md`, slice 6). It needed no new screen: a card appears above Right now when a revised notice arrives for the chosen area, and it is made by comparing two plans from the planner. A second, messier sample photo was added so the photo reader is shown on something that is not the clean sample. The video table above is the plan as first written; the timings that were filmed are in `submission/video-script.md`.
