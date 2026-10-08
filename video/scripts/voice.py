"""Generate the narration with ElevenLabs, with word timings for the captions.

Usage: ELEVENLABS_API_KEY=... python scripts/voice.py
Writes public/vo/<id>.mp3 for every line in src/narration.json and
src/timeline.json with each line's duration and word start times.
"""
import base64
import json
import os
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICE = "iP95p4xoKVk53GoZ742B"  # Chris: charming, down-to-earth
MODEL = "eleven_multilingual_v2"
SETTINGS = {"stability": 0.5, "similarity_boost": 0.75, "style": 0.15, "speed": 1.1}
KEY = os.environ["ELEVENLABS_API_KEY"]


def spoken(text):
    # Same length as the written form, so alignment indices still map to it.
    return text.replace("HiGHS", "Highs")


def tts(text, prev, nxt):
    body = {"text": spoken(text), "model_id": MODEL, "voice_settings": SETTINGS,
            "previous_text": spoken(prev), "next_text": spoken(nxt)}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"xi-api-key": KEY, "content-type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def speech_end(mp3):
    """Seconds until the trailing silence, plus a short release."""
    log = subprocess.run(["ffmpeg", "-i", str(mp3), "-af", "silencedetect=n=-45dB:d=0.2", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    total = float(log.split("Duration: ")[1].split(",")[0].split(":")[-1]) + 60 * int(log.split("Duration: ")[1].split(":")[1])
    starts = [float(l.split("silence_start: ")[1]) for l in log.splitlines() if "silence_start" in l]
    ends = [l for l in log.splitlines() if "silence_end" in l]
    trailing = len(starts) > len(ends) or (ends and abs(float(ends[-1].split("silence_end: ")[1].split()[0]) - total) < 0.05)
    return min(total, starts[-1] + 0.15) if starts and trailing else total


def words(text, starts):
    out, i = [], 0
    for w in text.split(" "):
        out.append({"w": w, "t": round(starts[i], 3)})
        i += len(w) + 1
    return out


lines = json.loads((ROOT / "src/narration.json").read_text())
out = []
for n, line in enumerate(lines):
    prev = lines[n - 1]["text"] if n else ""
    nxt = lines[n + 1]["text"] if n + 1 < len(lines) else ""
    res = tts(line["text"], prev, nxt)
    mp3 = ROOT / "public/vo" / f"{line['id']}.mp3"
    mp3.write_bytes(base64.b64decode(res["audio_base64"]))
    dur = speech_end(mp3)
    align = res["alignment"]
    assert len(align["characters"]) == len(line["text"]), line["id"]
    out.append({**line, "seconds": round(dur, 3), "words": words(line["text"], align["character_start_times_seconds"])})
    print(line["id"], out[-1]["seconds"])
(ROOT / "src/timeline.json").write_text(json.dumps(out, indent=1) + "\n")
print("total", round(sum(l["seconds"] for l in out), 1))
