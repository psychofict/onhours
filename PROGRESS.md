# Progress

## 16 October 2026

Started from an empty folder with the Devpost Learn skill pack (`npx skills add challengepost/learn-ai-basics --all -y`) and worked through it in order.

- Planning: `devpost/scope.md`, `devpost/prd.md` and `devpost/spec.md` written and approved, then `devpost/checklist.md` with three build slices.
- Slice 1, a pasted notice becomes a planned day: the planner, the built-in notice reader, the server and the page. The first two planned slices were merged; the reason is under Revisions in the checklist.
- Slice 2, the AI reader: an OpenAI-compatible model reads loose wording, every reply is checked, and the built-in rules take over on any failure. Checked live with a small model: the sample notice read in 1.5 s with all six areas right.
- Slice 3, the jobs editor and Copy plan.
- Checked at 1280 and 390 pixels wide in a headless browser: the sample journey places five jobs and lists one that does not fit, Copy plan copies the text, no console errors, light background.
- `node --test`: 16 tests pass.

## Next

- Final review, the app map (`devpost/app-map.html`) and the demo video.
- Publishing the repository and the video, and the Devpost submission, are separate steps that have not been taken.
