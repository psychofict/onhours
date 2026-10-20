# How the demo video is made

The film `onhours-demo-v2.mp4` is built by script from the running app, so it can be made again. Nothing in it is a mock-up of the product: every picture of OnHours is a recording of the real page. The group chat, the phone home screen (with its Add to home screen prompt), the quick-settings panel for airplane mode and the three "who it is for" cards are drawn for the film (`tools/video/scenes/`, and `QUICK_SETTINGS` in `tools/video/record.cjs`) and use made-up names and no third-party marks. There is no music.

## What you need

- Node.js 20 or newer, `ffmpeg` and `ffprobe` (with libx264 and libass).
- `playwright-core` and a Chromium it can start. Set `PLAYWRIGHT_CORE` to the module's path and `CHROME_BIN` to the browser binary if they are not found by default.
- The Geist font installed (or its folder in `FONTS`), for the captions.
- A voice. The film uses Murf (voice `en-US-natalie`, style Narration), with its key in `MURF_API_KEY`. Any other voice works: put one WAV file per line into `submission/work/takes/<id>.wav`, named after the ids in `tools/video/narration.json`, and skip the first step below.
- The app running with its AI reader on, because the film reads a photo for real: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` and `LLM_VISION_MODEL` (see `.env.example`). Without them the photo shot cannot be recorded.

## Steps

Run everything from the repository root. Working files go to `submission/work/`, which git ignores.

```sh
# 1. Narration: one take per line, listened to by Whisper, joined with chosen gaps
python3 tools/video/narrate.py takes              # asks Murf for every line not yet taken
python3 tools/video/check_takes.py                # Whisper small and medium against the script
python3 tools/video/narrate.py takes s3c          # a mis-heard line: ask again by its id
python3 tools/video/narrate.py assemble           # writes narration.wav and timeline.json

# 2. The shots (the app on :5174 with the AI reader on, the scene server on :5192)
node tools/video/serve.cjs &
node tools/video/record.cjs                       # every shot, or name some: record.cjs phone-a desk-b

# 3. The film: backgrounds, phone frame, captions, narration at -16 LUFS
node tools/video/compose.cjs                      # writes submission/onhours-demo-v2.mp4 and .srt

# 4. The written script, with its times taken from the finished narration
python3 tools/video/make-script.py --lufs -16.1 --peak -1.4   # writes submission/video-script.md
```

Then check the result:

```sh
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,duration -of compact submission/onhours-demo-v2.mp4
ffmpeg -hide_banner -i submission/onhours-demo-v2.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12
ffmpeg -i submission/onhours-demo-v2.mp4 -vf "fps=1/2,scale=480:-1,tile=6x5" -frames:v 3 sheet-%d.png   # look at every second picture
```

## How it works

| Piece | What it does |
| --- | --- |
| `tools/video/narration.json` | The spoken line and the caption for each sentence, and the quiet before it |
| `tools/video/narrate.py` | Murf takes, silence trimmed, joined on one timeline |
| `tools/video/check_takes.py` | Whisper (small and medium) against the script, word error per take |
| `tools/video/capture.cjs` | Records a scripted browser session from the page's own screencast at device pixels (a phone at 2x, a laptop at 1.5x), plus a hand that moves and taps like a person |
| `tools/video/segments.cjs` | Where each shot sits in the film, worked out from the narration timeline, so a shot and the line it illustrates cannot drift apart |
| `tools/video/record.cjs` | One script per shot. Every action is timed from the narration, for example `at(A("s2b", 0.9))` is 0.9 s after line `s2b` begins |
| `tools/video/make-script.py` | Writes `submission/video-script.md` from the timeline |
| `tools/video/scenes/` | The drawn scenes and the stage (paper, phone frame, panels) |
| `tools/video/compose.cjs` | Fits each shot to its stretch, frames the phone, adds soft dips between scenes, burns in captions, mixes the voice to -16 LUFS |

The recorded shots use the page's demo clock (`?now=08:00`), so "Right now" always shows the same moment, before the first cut ends, and the film says on screen that the clock is set. The photo shots read the two sample photos live through the AI reader, so the app has to be running with it switched on.

## Measured on the finished film

Length 158.8 s (2:38.8), 1920 x 1080 at 30 frames a second, H.264 video and AAC audio (mono, 48 kHz), integrated loudness -16.1 LUFS, true peak -1.4 dBFS, 22.5 MB (ffprobe and ffmpeg ebur128, 21 October 2026). The caption file `onhours-demo-v2.srt` has the same words as the burned-in captions.

If you change a line, or use a different voice, the lines may change length. The shots are timed from the narration, so run all four steps again.
