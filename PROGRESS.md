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

- Demo video on YouTube: https://youtu.be/JEv8nrvxmA4

## 18 October 2026

- Added the MIT `LICENSE` the hackathon rules ask for, filled the repository and video links in `submission/devpost-text.md`, and published the repository at https://github.com/psychofict/onhours.

## Next

- Complete and submit the Devpost form from `submission/devpost-text.md`.
