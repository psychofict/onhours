# How the demo video is made

The film `onhours-demo-v2.mp4` is built by script from the running app, so it can be made again. Nothing in it is a mock-up of the product: every picture of OnHours is a recording of the real page. The group chat, the phone home screen and the three "who it is for" cards are drawn for the film (`tools/video/scenes/`) and use made-up names and no third-party marks. There is no music.

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
| `tools/video/record.cjs` | One script per shot, timed to the narration with `at(seconds)` |
| `tools/video/scenes/` | The drawn scenes and the stage (paper, phone frame, panels) |
| `tools/video/compose.cjs` | Fits each shot to its stretch, frames the phone, adds soft dips between scenes, burns in captions, mixes the voice to -16 LUFS |

The recorded shots use the page's demo clock (`?now=13:30`), so "Right now" always shows the same moment of the afternoon cut.

## Measured on the finished film

Length 138.9 s (2:18.9), 1920 x 1080 at 30 frames a second, H.264 video and AAC audio (mono, 48 kHz), integrated loudness -16.1 LUFS, true peak -1.4 dBFS. The caption file `onhours-demo-v2.srt` has the same words as the burned-in captions.

If you want a different voice, edit the lines in `narration.json`, ask for new takes, and run steps 1 and 3 again; the shots do not change.
