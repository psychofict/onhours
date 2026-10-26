# Rules check

Every rule in the official rules of Build With AI: Basics (https://learn-ai-basics.devpost.com/rules, read on 20 October 2026), and the standing rules for this work, with what was checked and what is left for a person. Status words: Met means the evidence below was produced on 21 October 2026, or on 24 October 2026 where the row says so; Needs a person means it cannot be done or confirmed from the repository.

The submission period ends Monday 26 October 2026 at 5:00 pm Eastern Time, which is Tuesday 27 October at 06:00 in Seoul. Nothing in this folder has been sent, uploaded, pushed or published.

## The official rules

| Rule | Status | Evidence |
| --- | --- | --- |
| Stage 1 (section 6): fits the theme and was built with the Devpost Learn skill pack, as evidenced by `scope.md`, `prd.md` and `spec.md` in the repository | Met | The four documents are in `devpost/` (with `checklist.md`). `skills-lock.json` lists the pack's six skills (1-start to 6-ship). The git history starts on 16 October 2026 with "Start from an empty folder with the Devpost Learn skill pack", then the plan, then the build, and version 2 repeats plan then build. The pack's own folders are git-ignored; `README.md` gives the command that installs them again |
| Create a working proof of concept that performs at least one function end to end (section 4) | Met | `node tools/check-journey.cjs` passes every check at 1280 and 390 px wide: photo, area, a job in plain words, plan, backup, plan picture, calendar file, saved household, offline reload, a revised notice, forget this device. `tools/check-acceptance.cjs` passes every acceptance line of `devpost/prd.md` (28 lines, run on 21 October 2026, including with the AI reader off, failing and offline). `node --test`: 69 pass, 0 fail |
| Installs and runs consistently, and works as shown in the video and text (section 4, Functionality) | Met, with one condition | `node server/index.js` on Node 20 or newer, no packages (`package.json` has no dependencies; there is no `node_modules`). The sample day, text reading and everything after it work with no key. Reading a photo needs an AI endpoint, which `README.md` says; the film reads photos live through the company's gateway |
| Runs on the platform it is built for (section 4, Platforms) | Met | A web page served by Node. The film shows it on a phone-sized browser (390 x 844 at 2x) and a laptop-sized one (1280 x 720 at 1.5x) |
| New project, built during the submission period of 22 September to 26 October 2026; disclose pre-existing code (section 4) | Met | First commit 16 October 2026, 14:39 Seoul time, from an empty folder. Nothing pre-existing is included except two fonts (Newsreader and Geist, SIL Open Font License, files in `public/fonts/`). No packages |
| Third-party tools and services used within their terms (section 4) | Needs a person | The company's own model gateway (ours). Fonts under the OFL, licence files shipped. The film's narration is Murf, an AI voice: confirm the plan used allows public use of the audio. Playwright, ffmpeg and Whisper were used to make the film and are not part of the project |
| Public repository on GitHub, GitLab or Bitbucket with all code, assets and instructions (section 4) | Met | https://github.com/psychofict/onhours is public and holds version 2 with its full history; the entry links to it since 27 October 2026 |
| An open-source licence, visible in the repository's About section | Met | `LICENSE` is the standard MIT text (copyright Ebenworks Systems (Private) Limited) |
| A text description of the features and functionality | Met | `submission/devpost-text.md`, ready to paste (draft only) |
| A demonstration video under three minutes | Met | `submission/onhours-demo-v2.mp4` is 2:39.2 (ffprobe: 159.167 s), 1920 x 1080, -16.2 LUFS |
| Footage of the project running on the device it was built for | Met | Every picture of the product is a recording of the real page, made by script (`tools/video/`). The group chat, the home-screen prompt, the airplane-mode panel and the three household cards are drawn for the film, and `devpost-text.md` says so |
| The video is public on YouTube or Vimeo, with the link on the form | Met | Version 2 is public at https://youtu.be/1C87Fm40m0w, on the form and on the project page (read signed out on 24 October 2026). The entry no longer shows version 1 |
| No third-party trademarks, copyrighted music or other material without permission (section 4) | Met, one call for a person | No music. Fonts are under the OFL. No logos appear. Plain-text names only: Devpost (the hackathon's own name, also in the app's footer), GitHub (the closing caption), and Ikeja Electric and Legit.ng, named as the source of one sourced fact. A person may prefer to drop the last two |
| One unique submission (section 4, Multiple Submissions) | Met | One project |
| Original work, solely owned, no one else's IP (sections 4 and 7) | Met in the repository; Needs a person for the form | All code, the sample photos, the drawn scenes and the text are original. The copyright holder in `LICENSE` is Ebenworks Systems (Private) Limited, so the entrant and the authorised representative on the form should match |
| Testing access: free, no restriction, until judging ends (section 4) | Met | A public repository with an MIT licence and a film. It runs locally with Node alone. There is no hosted demo and no login; hosting the AI reader openly would expose a paid model |
| English (section 4, Language) | Met | All text, captions and narration are English |
| Eligibility (section 3) and no financial or preferential support from Devpost (section 4) | Needs a person | Nothing in the repository suggests funding, a contract or a licence from Devpost, but the repository cannot prove it |
| Personal information and publicity (section 10) | Met | The film and text hold no real person's name, likeness or voice. The narrator is synthetic and the households are made up. The only real names are organisations cited as sources |
| Draft submissions and changes (section 5) | Not applicable | Nothing has been entered on Devpost |

## Standing rules for this work

| Rule | Status | Evidence |
| --- | --- | --- |
| No npm dependencies | Met | `package.json` has none |
| The model only reads; plain tested code places the jobs | Met | `planDay()` and `diffPlans()` in `public/planner.js` call no model; the card that says what moved is built from two plans |
| Every model reply is checked; a bad one falls back to the rules | Met | `validateAreas()`; `test/read-notice.test.js` and `test/read-photo.test.js` cover a good reply, a bad one, a cut-off one and none |
| No key and no real `.env` committed | Met | `git ls-files` lists no `.env`; `git grep` finds no key-shaped string |
| The gateway address is in no public file, the film or the captions | Not met by one file I did not write | `.github/workflows/no-direct-anthropic.yml` (commit f82198a, already on `origin/main` since version 1) names the gateway host in a comment and an error message. Its header says the infra scripts write it, it must not be edited here, and the daily fleet scan fails if it differs. I left it alone. Everything else, including the code, docs, captions and film, was searched and holds no gateway address. For the company to decide: change the script in `ebenworks-infra`, regenerate, push |
| The repository stays endpoint-agnostic | Met | Only `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` and `LLM_VISION_MODEL` are read; `.env.example` has no values |
| Sample data is fictional | Met | `public/sample.js`; both sample photos are drawn from `tools/sample-photo/notice.html` and `notice2.html`; the film labels the household cards illustrative |
| Light theme only | Met | No `prefers-color-scheme` in the styles; `color-scheme: light`; the journey check reads the page background as rgb(247, 241, 232) at both widths; the film and gallery use the paper background |
| Checked at 1280 and 390 px after visual changes | Met | `tools/check-journey.cjs`, and screenshots of the new card, the photo buttons and the share buttons at both widths |
| `node --test` before each commit | Met | 69 pass before the commits of 21 October |
| Commit messages in plain words, repository author, no Co-Authored-By, no rewritten history | Met | `git log` shows the configured author on every commit, none with a Co-Authored-By trailer |
| No employer, home city, earnings, contract or real person's contact details in public files | Met | Searched the tracked text, the captions and the docs: none. Note: the commit author address (ebstarmusic@gmail.com) has been in the public history since 16 October |
| Local only: no deploy, push, upload, GitHub setting, Devpost edit, email or post | Met | Nothing was sent. The commits are local |
| Free or already-paid tools only | Met | The company gateway and the Murf key already held; nothing was bought or signed up for |
