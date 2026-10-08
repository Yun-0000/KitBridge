# KitBridge demo film

A 2-minute narrated walkthrough, built with [Remotion](https://www.remotion.dev).
The published cut lives at `public/demo/kitbridge-demo.mp4`.

| Path | What it is |
| :--- | :--- |
| `src/narration.json` | The script, one entry per spoken line, grouped by scene. |
| `src/timeline.json` | Line lengths and word start times from the generated voice. Scene timing and the word-by-word captions follow from it. |
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
  --browser-executable=/path/to/chrome-headless-shell
```

The published file is loudness-normalized afterwards:

```sh
ffmpeg -i out/kitbridge-demo.mp4 -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 \
  -ar 48000 -c:a aac -b:a 192k -movflags +faststart ../public/demo/kitbridge-demo.mp4
node scripts/captions.mjs   # rewrites ../public/demo/captions.vtt
```

## Changing the script

The voice is ElevenLabs "Chris" (`eleven_multilingual_v2`, speed 1.1). Edit
`src/narration.json`, then:

```sh
ELEVENLABS_API_KEY=... python scripts/voice.py   # rewrites public/vo and src/timeline.json
```

The music bed (`public/music/bed.mp3`) and the sounds in `public/sfx/` were made
with the ElevenLabs Music and Sound Effects APIs. If the film gets much longer,
generate a new bed of matching length. The key is read from the environment
and is not stored in the repository.

Scene lengths follow the new line lengths. Screens are fixed screenshots, so if
the interface changes, run the app and recapture them with
`node scripts/capture.cjs` (needs Playwright), which also rewrites `src/boxes.json`.

Remotion is free for individuals and small teams; see its
[license](https://www.remotion.dev/license) before using it in a larger company.
