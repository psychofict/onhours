#!/usr/bin/env python3
"""Makes the narration for the demo video from narration.json with Murf (voice en-US-natalie, style Narration, model GEN2).

    MURF_API_KEY=... python3 tools/video/narrate.py takes [id ...]     # one take per line; existing takes are kept unless named
    python3 tools/video/narrate.py assemble                              # joins the takes, writes timeline.json and narration.wav

Murf gives a different take every call, so a line that is mis-heard is simply asked for again by naming its id.
Work files go to submission/work/ (ignored by git). The key is read from the environment and never printed.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WORK = os.path.join(ROOT, "submission", "work")
TAKES = os.path.join(WORK, "takes")
LINES = json.load(open(os.path.join(os.path.dirname(__file__), "narration.json")))
GAP_LINE, GAP_SCENE = 0.5, 1.3     # seconds of quiet between lines, and between scenes
LEAD, TAIL = 1.5, 4.5              # quiet before the first line (the picture opens first) and after the last
VOICE, STYLE, MODEL = "en-US-natalie", "Narration", "GEN2"


def murf(text):
    body = {"voiceId": VOICE, "style": STYLE, "text": text, "format": "WAV", "sampleRate": 24000, "channelType": "MONO", "modelVersion": MODEL}
    req = urllib.request.Request("https://api.murf.ai/v1/speech/generate", data=json.dumps(body).encode(), method="POST",
                                 headers={"api-key": os.environ["MURF_API_KEY"], "Content-Type": "application/json", "Accept": "application/json"})
    for attempt in range(3):
        try:
            d = json.loads(urllib.request.urlopen(req, timeout=90).read())
            return urllib.request.urlopen(d["audioFile"], timeout=90).read()
        except urllib.error.HTTPError as e:
            if e.code < 500 or attempt == 2:
                raise SystemExit(f"Murf {e.code}")
            time.sleep(3)


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode().strip())


def trimmed(src, dst):
    """Cut leading and trailing silence so the gaps are the ones this script chooses."""
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-i", src, "-af",
                           "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse",
                           "-ar", "24000", "-ac", "1", dst])


def takes(only):
    os.makedirs(TAKES, exist_ok=True)
    for line in LINES:
        raw = os.path.join(TAKES, f"{line['id']}.raw.wav")
        if only and line["id"] not in only:
            continue
        if os.path.exists(raw) and not only:
            continue
        open(raw, "wb").write(murf(line["say"]))
        trimmed(raw, os.path.join(TAKES, f"{line['id']}.wav"))
        print(line["id"], round(duration(os.path.join(TAKES, f"{line['id']}.wav")), 2), "s")


def assemble(tempo=1.0):
    inputs, filters, timeline, t, prev_scene = [], [], [], LEAD, None
    for i, line in enumerate(LINES):
        path = os.path.join(TAKES, f"{line['id']}.wav")
        d = duration(path) / tempo
        if prev_scene is not None:
            t += line.get("gap", GAP_SCENE if line["scene"] != prev_scene else GAP_LINE)
        timeline.append({"id": line["id"], "scene": line["scene"], "start": round(t, 3), "end": round(t + d, 3), "caption": line["caption"]})
        inputs += ["-i", path]
        filters.append(f"[{i}:a]{'atempo=%s,' % tempo if tempo != 1.0 else ''}adelay={int(t * 1000)}|{int(t * 1000)}[a{i}]")
        t += d
        prev_scene = line["scene"]
    t += TAIL
    mix = "".join(f"[a{i}]" for i in range(len(LINES))) + f"amix=inputs={len(LINES)}:normalize=0:dropout_transition=0,apad=whole_dur={round(t, 3)}[m]"
    os.makedirs(WORK, exist_ok=True)
    out = os.path.join(WORK, "narration.wav")
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filters + [mix]), "-map", "[m]", "-t", str(round(t, 3)), "-ar", "48000", "-ac", "1", out])
    json.dump({"total": round(t, 3), "lines": timeline}, open(os.path.join(WORK, "timeline.json"), "w"), indent=1)
    print("narration", round(t, 2), "s ->", out)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "takes":
        takes(set(sys.argv[2:]))
    elif cmd == "assemble":
        assemble(float(sys.argv[2]) if len(sys.argv) > 2 else 1.0)
    else:
        raise SystemExit(__doc__)
