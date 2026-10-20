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
const { timeline, TOTAL } = require("./segments.cjs");
const PAPER = "0xF7F1E8";

const P = (o) => new URLSearchParams(o).toString();
const { SEGMENTS } = require("./segments.cjs");
const isPhoneAt = (t) => { const s = SEGMENTS.find((x) => t >= x.t0 && t < x.t1); return Boolean(s && s.phone); };

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
  const mp = await (await browser.newContext({ viewport: { width: 434, height: 940 } })).newPage();
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
    f.push(`[${shotIdx}:v]scale=434:940:flags=lanczos,${fit},format=yuva420p[scr]`);
    f.push(`[${maskIdx}:v]format=gray[mk]`);
    f.push(`[scr][mk]alphamerge[rounded]`);
    f.push(`${last}[rounded]overlay=257:83:shortest=1,${fades},format=yuv420p[v]`);
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
  const wrap = (t, width = 66) => {
    if (t.length <= width) return t;
    // break as evenly as possible into the fewest lines of at most `width` characters
    const lines = Math.ceil(t.length / width), target = t.length / lines;
    const words = t.split(" "), out = [];
    let cur = "";
    for (const w of words) {
      if (cur && (cur + " " + w).length > Math.max(target + 4, 1) && out.length < lines - 1) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
    }
    out.push(cur);
    return out.join("\\N");
  };
  const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Cap,Geist SemiBold,44,&H001A1B1C,&H001A1B1C,&H18FFFFFF,&H00000000,0,0,0,0,100,100,0,0,3,16,0,2,160,160,44,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
    // beside a phone the caption sits in the right-hand panel (margins 840 and 40) and wraps at 40 characters
    cs.map((c) => { const phone = isPhoneAt((c.start + c.end) / 2); return `Dialogue: 0,${ts(c.start)},${ts(c.end)},Cap,,${phone ? 840 : 0},${phone ? 40 : 0},0,,${wrap(c.text, phone ? 40 : 66)}`; }).join("\n") + "\n";
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
