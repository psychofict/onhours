# OnHours version 2: result

Answer first: version 2 is built, tested and committed locally (nothing pushed, uploaded or sent), with a narrated film of 2:39. What decides the score from here is not in the code: all six simulated judges, in both rounds, named the same gap, which is that no real household has tried it. The rest of this note is what was built, what was measured, what is unfinished, and what a person has to do before Monday 26 October 5:00 pm Eastern (Tuesday 27 October, 06:00 in Seoul).

## What was built

- Plan first, again, with the Devpost Learn skills: `devpost/UPGRADE-PLAN.md`, then `scope.md`, `prd.md`, `spec.md` and `checklist.md` (six slices).
- Photo of the notice read by a vision model (clean or messy), backup power that carries a job across a cut, a Right now card, a day chart, plain-words jobs, offline use and a saved household, share as a picture, a calendar file or text, and a Done tag on jobs that have ended.
- Slice 6, added after the first judge round: a revised notice shows what moved and why (`diffPlans()`), plus a second, messier sample photo.
- The film `submission/onhours-demo-v2.mp4` (with `.srt`), six gallery images, the Devpost text, the build notes for the film, the video script, a rules check and a judge simulation. The version 1 film is unchanged.

## What was cut, and why

Speech input stays cut (it needs the network, which is what the product avoids). "What moved" was cut on the first pass and brought back after the judges asked for it, because it needed no new screen. Accounts, live utility feeds and push reminders stay cut for the reasons in `devpost/scope.md`.

## Measured, on 21 October 2026

- `node --test`: 69 pass, 0 fail (including 300 random days that check no overlaps, no mains job in a cut, and backup within budget).
- `tools/check-journey.cjs` passes at 1280 and 390 px wide. `tools/check-acceptance.cjs` passes all 28 acceptance lines of the requirements, including with the AI reader off, failing and offline.
- Lighthouse accessibility, best practices, SEO and agentic browsing: 100 on a phone and on a laptop, and 100 with the "notice changed" card on screen. Layout shift 0.007 and largest paint 56 ms on a first visit; 0.038 when a saved plan is restored (still in the good range).
- Photo reading through the company gateway: the clean sample gave all six areas in earlier runs of 2.6 to 3.4 seconds; the messy sample gave its five areas with the right times (the overnight and "then" cuts split correctly) in each run we looked at today, and the acceptance check compares the times with the picture.
- The film: 159.2 s, 1920 x 1080, 30 frames a second, -16.2 LUFS, true peak -1.3 dBFS, 24.3 MB. The narration is 21 Murf lines, each listened to by Whisper in two sizes; every line is within 0.12 word error, and the differences are the product name, which recognisers hear as "on ours" or "an hour".
- Simulated judges, three roles, two rounds: Design 8 and 8, Potential Impact 6.0 and 5.7, Innovation 5.7 and 6.0, Presentation 8.0 and 7.7 (averages). None put it in the top three. Details and what was changed are in `submission/JUDGE-SIMULATION.md`. These are our own sub-agents, not a prediction.

## What is unfinished

- No real-user evidence. Everything shown is fictional sample data. This is the one finding that caps the score, and it cannot be written; it has to be done. One tailor, baker or pump household planning a day from the notice they really received, with their permission, as a short clip or a quote, would be worth more than anything left in the code.
- Nobody has listened to the narration by ear; only Whisper has. Someone should play the film once through, with sound, before it is uploaded.
- The fixes made after the second judge round have not been judged again.
- The "Final review complete" box in `devpost/checklist.md` is left unticked on purpose.
- The slice-6 documents were committed one commit after the slice-6 code, not in the same commit (the repository rule). History is not rewritten.

## What a person has to do

Done on 24 October 2026: step 1 (the film is public at https://youtu.be/1C87Fm40m0w and on the form), step 4 (the text and the six images are on the entry) and the submission in step 8. For step 2, GitHub has the company's account offline, so version 2 is public on GitLab instead (`PROGRESS.md`, 24 October).

1. Listen to the film once. Then upload `submission/onhours-demo-v2.mp4` to YouTube as public (or to Vimeo), and put the link in the "Video" line of `submission/devpost-text.md` and on the form. The only YouTube link now is version 1.
2. Push version 2 through the company's push queue. The repository on GitHub still holds version 1; the local branch is ahead by the commits listed by `git log origin/main..HEAD`. After the push, look at the About box on GitHub and confirm it shows the MIT licence.
3. Decide about `.github/workflows/no-direct-anthropic.yml`. It is written by the infra scripts (it says not to edit it here), it is already public, and it names the model gateway's address. If that address should not be public, change the script in `ebenworks-infra`, regenerate the file and push.
4. Paste `submission/devpost-text.md` into the form and add the six gallery images in the order the file lists.
5. Confirm who the entrant and the authorised representative are (the licence names Ebenworks Systems (Private) Limited), that the entrant is eligible, and that the Murf plan allows public use of the narration. These are on `submission/RULES-CHECK.md`.
6. Decide whether the film should name Ikeja Electric and Legit.ng as the source of one fact (no logos are shown).
7. If you can get one real household before the deadline, add them: it is the biggest lever left.
8. Tick the final review box when satisfied, and submit.

## Cost

Nothing new was bought. The narration used the Murf key the company already holds (six more calls on 21 October, for the new and changed lines and two retakes); model reads used the company's own gateway at a fraction of a cent each; everything else (Node, Playwright, ffmpeg, Whisper) is free and local.

## Where things are

`submission/`: the film and captions, `devpost-text.md`, `gallery/`, `video-script.md`, `BUILD-VIDEO.md`, `RULES-CHECK.md`, `JUDGE-SIMULATION.md` and this note. `devpost/`: the planning documents and the app map. `tools/`: how the film, the gallery, the sample photos and the checks are made. `PROGRESS.md` has the log.
