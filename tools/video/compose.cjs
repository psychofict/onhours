#!/usr/bin/env node
// Builds the demo video from the shots: backgrounds and panels, the phone frame, dips between scenes,
// burned-in captions (and an .srt), and the narration, mixed to -16 LUFS.
//   node tools/video/compose.cjs            -> submission/onhours-demo-v2.mp4, submission/onhours-demo-v2.srt
// Needs: record.cjs run first, narrate.py assemble run first, `node tools/video/serve.cjs` running, ffmpeg.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");

const ROOT = path.resolve(__dirname, "..", "..");
const WORK = path.join(ROOT, "submission", "work");
const SHOTS = path.join(WORK, "shots");
const STAGES = path.join(WORK, "stages");
const SEGS = path.join(WORK, "segments");
const SCENES = process.env.SCENES || "http://localhost:5192";
const CHROME = process.env.CHROME_BIN || undefined;
const timeline = JSON.parse(fs.readFileSync(path.join(WORK, "timeline.json"), "utf8"));
const TOTAL = timeline.total;
const PAPER = "0xF7F1E8";

// Which shot fills which stretch of the film, and which panel sits beside the phone.
const P = (o) => new URLSearchParams(o).toString();
const SEGMENTS = [
  { shot: "chat", t0: 0, t1: 10.0, phone: true, panels: [[0, 10.0, { eyebrow: "The problem", title: "The schedule arrives as <em>a picture</em>.", sub: "In the group chat, a few hours before the power goes.", time: "07:12" }]] },
  { shot: "phone-a", t0: 10.0, t1: 41.9, phone: true, panels: [
    [10.0, 23.5, { eyebrow: "Photo in, plan out", title: "Take a photo. <em>Get a day.</em>", sub: "OnHours reads every area and its power cuts, then plans around them." }],
    [23.5, 41.9, { eyebrow: "How it decides", title: "The AI reads. <em>Code decides.</em>", flow: "1" }]] },
  { shot: "desk-b", t0: 41.9, t1: 71.5, phone: false },
  { shot: "home", t0: 71.5, t1: 75.0, phone: true, panels: [[71.5, 75.0, { eyebrow: "Installed, not signed up", title: "On your <em>home screen</em>.", sub: "One visit online. After that it opens with no network." }]] },
  { shot: "phone-c", t0: 75.0, t1: 100.3, phone: true, panels: [
    [75.0, 78.4, { eyebrow: "When the lights go out", title: "Your plan, <em>saved</em> on the phone.", sub: "Jobs, area and last notice, kept in this browser only." }],
    [78.4, 86.9, { eyebrow: "No power. No network.", title: "Still <em>there</em>.", sub: "Right now: power is off until 15:00. Next: iron at 15:00.", airplane: "1" }],
    [86.9, 93.1, { eyebrow: "Yours alone", title: "No account. <em>Nothing tracked.</em>", sub: "Forget this device clears it all.", airplane: "1" }],
    [93.1, 100.3, { eyebrow: "Into the family chat", title: "A picture, <em>or a calendar</em>.", sub: "A reminder ten minutes before every cut.", airplane: "1" }]] },
  { shot: "audience", t0: 100.3, t1: 118.0, phone: false },
  { shot: "planfirst", t0: 118.0, t1: 131.0, phone: false },
  { shot: "closing", t0: 131.0, t1: TOTAL, phone: false },
];

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "ignore", "inherit"] });
const probe = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const fmt = (n) => n.toFixed(3);

async function makeStages() {
  fs.mkdirSync(STAGES, { recursive: true });
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const jobs = [];
  for (const seg of SEGMENTS) {
    if (!seg.phone) continue;
    seg.panels.forEach(([a, b, params], i) => {
      const q = P({ phone: "1", ...params });
      const file = path.join(STAGES, `${seg.shot}-${i}.png`);
      jobs.push({ q, file });
      seg.panels[i] = [a, b, params, file];
    });
  }
  for (const j of jobs) {
    await page.goto(`${SCENES}/stage.html?${j.q}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await page.screenshot({ path: j.file });
  }
  const mp = await (await browser.newContext({ viewport: { width: 388, height: 840 } })).newPage();
  await mp.goto(`${SCENES}/mask.html`);
  await mp.screenshot({ path: path.join(STAGES, "mask.png") });
  await browser.close();
}

function segmentVideo(seg, idx) {
  fs.mkdirSync(SEGS, { recursive: true });
  const dur = seg.t1 - seg.t0;
  const out = path.join(SEGS, `${String(idx).padStart(2, "0")}-${seg.shot}.mp4`);
  const shot = path.join(SHOTS, `${seg.shot}.mp4`);
  const have = probe(shot);
  // Fit the footage to its stretch: pad with the last frame, or cut the tail.
  const fit = `tpad=stop_mode=clone:stop_duration=${fmt(Math.max(dur - have, 0) + 0.5)},trim=duration=${fmt(dur)},setpts=PTS-STARTPTS,fps=30`;
  const fades = `fade=t=in:st=0:d=0.2:color=${PAPER},fade=t=out:st=${fmt(dur - 0.2)}:d=0.2:color=${PAPER}`;
  const args = ["-v", "error", "-y"];
  if (!seg.phone) {
    args.push("-i", shot, "-vf", `scale=1920:1080:flags=lanczos,${fit},${fades},format=yuv420p`);
  } else {
    // one background per panel, switched on by time; the screen is the footage with rounded corners
    const bgs = seg.panels;
    bgs.forEach((p) => args.push("-loop", "1", "-t", fmt(dur), "-i", p[3]));
    args.push("-i", shot, "-loop", "1", "-t", fmt(dur), "-i", path.join(STAGES, "mask.png"));
    const f = [];
    let last = "[0:v]";
    for (let i = 1; i < bgs.length; i++) {
      const from = bgs[i][0] - seg.t0;
      f.push(`${last}[${i}:v]overlay=enable='gte(t,${fmt(from)})'[b${i}]`);
      last = `[b${i}]`;
    }
    const shotIdx = bgs.length, maskIdx = bgs.length + 1;
    f.push(`[${shotIdx}:v]scale=388:840:flags=lanczos,${fit},format=yuva420p[scr]`);
    f.push(`[${maskIdx}:v]format=gray[mk]`);
    f.push(`[scr][mk]alphamerge[rounded]`);
    f.push(`${last}[rounded]overlay=256:74:shortest=1,${fades},format=yuv420p[v]`);
    args.push("-filter_complex", f.join(";"), "-map", "[v]");
  }
  args.push("-t", fmt(dur), "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", out);
  run("ffmpeg", args);
  return out;
}

// Captions: the narration's own words, in short chunks, timed across each line.
function chunks() {
  const out = [];
  for (const l of timeline.lines) {
    const sentences = l.caption.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g).map((s) => s.trim());
    const parts = [];
    for (const s of sentences) {
      if (s.length <= 72) { parts.push(s); continue; }
      const bits = s.split(/(?<=[,:;])\s+/);
      let cur = "";
      for (const b of bits) { if ((cur + " " + b).trim().length > 66 && cur) { parts.push(cur.trim()); cur = b; } else cur = (cur + " " + b).trim(); }
      if (cur) parts.push(cur);
    }
    const total = parts.reduce((n, p) => n + p.length, 0);
    let t = l.start;
    parts.forEach((p, i) => {
      const d = ((l.end - l.start) * p.length) / total;
      out.push({ start: t, end: i === parts.length - 1 ? l.end + 0.1 : t + d, text: p });
      t += d;
    });
  }
  return out;
}
const ts = (t, srt) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return srt ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0").replace(".", ",")}` : `${h}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`; };
function writeCaptions() {
  const cs = chunks();
  cs.push({ start: TOTAL - 4.2, end: TOTAL - 0.1, text: "Open source on GitHub: psychofict/onhours" });
  const srt = cs.map((c, i) => `${i + 1}\n${ts(c.start, true)} --> ${ts(c.end, true)}\n${c.text}\n`).join("\n");
  fs.writeFileSync(path.join(ROOT, "submission", "onhours-demo-v2.srt"), srt);
  const wrap = (t) => { if (t.length <= 66) return t; const mid = t.length / 2; const sp = [...t.matchAll(/ /g)].map((m) => m.index).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0]; return `${t.slice(0, sp)}\\N${t.slice(sp + 1)}`; };
  const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Cap,Geist SemiBold,44,&H001A1B1C,&H001A1B1C,&H18FFFFFF,&H00000000,0,0,0,0,100,100,0,0,3,16,0,2,160,160,44,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
    cs.map((c) => `Dialogue: 0,${ts(c.start)},${ts(c.end)},Cap,,0,0,0,,${wrap(c.text)}`).join("\n") + "\n";
  fs.writeFileSync(path.join(WORK, "captions.ass"), ass);
}

(async () => {
  const only = process.argv.includes("--final-only");
  if (!only) {
    await makeStages();
    const files = SEGMENTS.map((seg, i) => segmentVideo(seg, i));
    fs.writeFileSync(path.join(SEGS, "list.txt"), files.map((f) => `file '${f}'`).join("\n"));
  }
  writeCaptions();
  const concat = path.join(WORK, "concat.mp4");
  run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(SEGS, "list.txt"), "-c", "copy", concat]);
  // narration to -16 LUFS (two passes)
  const wav = path.join(WORK, "narration.wav");
  const stats = execFileSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json", "-f", "null", "-"], { stdio: ["ignore", "pipe", "pipe"] });
  const text = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${wav}" -af loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p'`]).toString();
  const m = JSON.parse(text);
  const norm = `loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
  const out = path.join(ROOT, "submission", "onhours-demo-v2.mp4");
  run("ffmpeg", ["-v", "error", "-y", "-i", concat, "-i", wav, "-vf", `subtitles=${path.join(WORK, "captions.ass")}:fontsdir=${process.env.FONTS || path.join(process.env.HOME, ".fonts")}`,
    "-af", norm, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", fmt(TOTAL), out]);
  console.log("wrote", out, probe(out).toFixed(2), "s");
})().catch((e) => { console.error(e); process.exit(1); });
