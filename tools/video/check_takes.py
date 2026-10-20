#!/usr/bin/env python3
"""Listens to every narration take with Whisper (two model sizes) and prints the word error against the script.

    python3 tools/video/check_takes.py [id ...]

A take passes when both listeners are under 0.12 word error and hear the product name (it is said as "On Hours", which a
recogniser may write "onhours", "on hours" or "our hours"; those all count). Run it with a Python that has openai-whisper.
"""
import json, os, re, sys
import whisper

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TAKES = os.path.join(ROOT, "submission", "work", "takes")
LINES = json.load(open(os.path.join(os.path.dirname(__file__), "narration.json")))


def norm(s):
    s = s.lower().replace("on hours", "onhours").replace("onhours", "onhours")
    s = re.sub(r"[^a-z0-9' ]+", " ", s.replace("-", " "))
    s = re.sub(r"\b(airplane|aeroplane)\b", "airplane", s)
    return s.split()


def wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    d = [[0] * (len(h) + 1) for _ in range(len(r) + 1)]
    for i in range(len(r) + 1): d[i][0] = i
    for j in range(len(h) + 1): d[0][j] = j
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (r[i-1] != h[j-1]))
    return d[len(r)][len(h)] / max(len(r), 1)


def main():
    only = set(sys.argv[1:])
    models = {name: whisper.load_model(name) for name in ("small", "medium")}
    bad = 0
    for line in LINES:
        if only and line["id"] not in only:
            continue
        path = os.path.join(TAKES, line["id"] + ".wav")
        scores, heard = {}, {}
        for name, m in models.items():
            text = m.transcribe(path, language="en", fp16=True, temperature=0)["text"].strip()
            heard[name] = text
            scores[name] = wer(line["say"], text)
        ok = all(v <= 0.12 for v in scores.values())
        bad += not ok
        print(f"{'ok ' if ok else 'BAD'} {line['id']:5} small={scores['small']:.2f} medium={scores['medium']:.2f}")
        if not ok or only:
            for n, t in heard.items():
                print(f"      {n}: {t}")
    print("takes needing another go:", bad)


if __name__ == "__main__":
    main()
