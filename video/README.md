# KitBridge demo film

A 2:06 narrated walkthrough, built with [Remotion](https://www.remotion.dev).
The narration, music and sound effects are AI-generated; every scene is built
from screenshots of the real app. The published cut lives at
`public/demo/kitbridge-demo.mp4` and on [YouTube](https://youtu.be/Ypg-yjubl4g).

| Path | What it is |
| :--- | :--- |
| `src/narration.json` | The script, one entry per spoken line, grouped by scene. |
| `src/timeline.json` | Line lengths and word start times from the recorded voice. Scene timing and the word-by-word captions follow from it. |
| `src/Root.tsx` | Puts scenes, voice, music, sound effects and captions together. Music ducks under the voice; captions are plain text, white on dark scenes and black on light ones. |
| `src/scenes.tsx` | The nine scenes. Camera moves, clicks and highlights are tied to narration lines. |
| `src/boxes.json` | Element positions in the app, recorded while capturing the screenshots. |
| `public/shots/` | Screenshots of the real app (1440 × 900 at 2×; phone at 3×). |
| `public/vo/` | Narration, one MP3 per line. |
| `public/music/bed.mp3` | Instrumental music bed. It dips under the voice and rises in pauses. |
| `public/sfx/` | Click, typing, transition and closing sounds. |

## Render

Requires Node.js 22 and a Chromium build (any `chrome-headless-shell` works).
Voice, music and sound effects are already in `public/`, so rendering needs no API key.

```sh
npm ci
npm run studio          # preview and scrub
npx remotion render src/index.ts KitBridgeDemo out/kitbridge-demo.mp4 \
  --codec=h264 --crf=18 --browser-executable=/path/to/chrome-headless-shell
```

The published file is loudness-normalized afterwards to −16 LUFS. Run `loudnorm`
once with `print_format=json` to measure, then pass the measured values back in
(`measured_I`, `measured_TP`, … and `linear=true`):

```sh
ffmpeg -i out/kitbridge-demo.mp4 -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=…:linear=true,alimiter=limit=0.8:level=false" \
  -ar 48000 -c:a aac -b:a 192k -movflags +faststart ../public/demo/kitbridge-demo.mp4
node scripts/captions.mjs   # rewrites ../public/demo/captions.vtt
```

## Changing the script

Edit `src/narration.json`, then:

```sh
python scripts/voice.py         # records new or changed lines, rewrites src/timeline.json
python scripts/voice.py --all   # records every line again
```

The voice API key is read from the environment and is not stored in the
repository. If the film length changes, make a new music bed of matching length
and set `MUSIC_AT` in `src/Root.tsx` so the music's own ending lands on the last frame.

Scene lengths follow the new line lengths. Screens are fixed screenshots, so if
the interface changes, run the app and recapture them with
`node scripts/capture.cjs` (needs Playwright), which also rewrites `src/boxes.json`.

Remotion is free for individuals and small teams; see its
[license](https://www.remotion.dev/license) before using it in a larger company.
