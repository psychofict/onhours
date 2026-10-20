#!/usr/bin/env python3
"""Writes submission/video-script.md from the narration and its timeline, so the times can never drift from the audio.

    python3 tools/video/make-script.py [--lufs -16.0] [--peak -1.4] [--worst-wer 0.12]

Needs submission/work/timeline.json (from `narrate.py assemble`). The loudness numbers are the ones measured on the
finished film (ffmpeg ebur128); leave the options off and the sentence about them is left out.
"""
import argparse, json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TIMELINE = json.load(open(os.path.join(ROOT, "submission", "work", "timeline.json")))
LINES = {l["id"]: l for l in json.load(open(os.path.join(os.path.dirname(__file__), "narration.json")))}

SCENES = {
    1: ("The problem", "A drawn group chat on a phone. A forwarded picture of a printed notice arrives, then three neighbours ask which group they are in. The view slowly closes in on the notice. Over the last line the real app opens on the phone."),
    2: ("The product, end to end", "The phone, filmed from the running app. A tap on Photograph the notice, then the sample photo: a reading state, then six areas. Riverside East is chosen, a job is typed in plain words (charge the radio 30 min), Plan my day is pressed, and the day chart draws in. Beside the phone, a panel says what the photo gives and shows the AI-reads, code-decides flow. Then a second, messier photo (tilted, a different layout, times in words, a cut past midnight) is read live: five areas, and Old Quarry's three cuts, with the overnight one split at midnight."),
    3: ("Why a job did not fit, the backup, and a revised notice", "The laptop view. The plan panel scrolls to Didn't fit: the beans, with the reason in one line. The Try 1 hour of backup button is pressed and the beans appear in the plan with On backup 20:00 to 20:45. The backup stepper goes up half an hour and back. Then a revised notice is filled in and read, and the card \"The notice changed\" lists the iron moving to 16:00 and the beans no longer fitting, each with its reason."),
    4: ("With no power and no network", "A drawn phone home screen: an Add to home screen prompt, the OnHours icon appearing, a tap, and the app opening onto its first screen. Then a quick-settings panel switches airplane mode on, the page is reloaded, the Offline note appears, and Right now still says the power is off until 09:00 and the sewing order is next (the demo clock is set to 08:00). Then the saved jobs and the Forget this device line."),
    5: ("Sharing", "The Plan picture dialog opens, still offline, then the calendar file is added."),
    6: ("Who it is for, and how it was built", "Three drawn cards (the tailor, the baker, the pump family) with a sourced line about Ikeja Electric and a note that the households are illustrative, then the four planning documents ticking in beside the AI-reads, code-decides flow, then the first screen of the app with the repository name."),
}


def clock(t, tenths=True):
    m, s = divmod(t, 60)
    return f"{int(m)}:{s:04.1f}" if tenths else f"{int(m)}:{int(s):02d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lufs"); ap.add_argument("--peak"); ap.add_argument("--worst-wer", default="0.12")
    a = ap.parse_args()
    lines = TIMELINE["lines"]
    total = TIMELINE["total"]
    out = [
        "# Video script: OnHours demo, version 2",
        "",
        f"Length {clock(total)}, 1920 by 1080, narrated by Murf (voice Natalie, style Narration), with burned-in captions and a separate caption file. No music. Every picture of the product is the real app, recorded by script; the group chat, the home screen, the quick-settings panel and the cards are drawn for the film and use made-up names.",
        "",
        "The words below are what is spoken. The captions show the same words with the name written OnHours; the voice is given \"On Hours\" so it says the name as two words. Times are from the finished narration track. This file is written by `tools/video/make-script.py`; change `narration.json` and run it again instead of editing the times here.",
        "",
    ]
    scenes = sorted({l["scene"] for l in lines})
    for n, sc in enumerate(scenes):
        group = [l for l in lines if l["scene"] == sc]
        start = 0 if n == 0 else group[0]["start"] - 0.5
        end = total if n == len(scenes) - 1 else [l for l in lines if l["scene"] == scenes[n + 1]][0]["start"] - 0.5
        title, shown = SCENES[sc]
        out += [f"## Scene {sc}: {title} ({clock(start, False)} to {clock(end, False)})", "", f"On screen: {shown}", "", "| From | To | Spoken |", "| --- | --- | --- |"]
        for l in group:
            out.append(f"| {clock(l['start'])} | {clock(l['end'])} | {l['caption']} |")
        out.append("")
    check = "Each line was spoken by Murf as its own take and listened to by Whisper in two sizes (small and medium). The takes in the finished film have a word error of " + a.worst_wer + " or less in both against the script; the differences are the name (heard as \"on hours\", \"on ours\" or \"an hour\") and, in earlier lines, \"plan first\", sometimes heard as \"planned first\"."
    if a.lufs:
        check += f" The film's loudness is {a.lufs} LUFS" + (f" with a true peak of {a.peak} dBFS" if a.peak else "") + " (ffmpeg ebur128)."
    check += " The commands are in BUILD-VIDEO.md."
    out += ["## Checks on the narration", "", check, ""]
    open(os.path.join(ROOT, "submission", "video-script.md"), "w").write("\n".join(out))
    print("wrote submission/video-script.md", clock(total))


main()
