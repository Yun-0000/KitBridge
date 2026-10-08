import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Composition,
  Html5Audio,
  Sequence,
  continueRender,
  delayRender,
  getInputProps,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Budget, Close, Hook, How, Intro, Packing, PhoneScene, Plan, PromiseScene } from "./scenes";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH, XFADE, lines, scenes, type SceneId } from "./timeline";
import { Caption, Sfx } from "./ui";

const FONTS = [
  ["Schibsted Grotesk", "schibsted-grotesk-latin-400-normal.woff2", "400"],
  ["Schibsted Grotesk", "schibsted-grotesk-latin-500-normal.woff2", "500"],
  ["Schibsted Grotesk", "schibsted-grotesk-latin-600-normal.woff2", "600"],
  ["Bricolage Grotesque", "bricolage-grotesque-latin-700-normal.woff2", "700"],
] as const;

function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(
      FONTS.map(([family, file, weight]) => {
        const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, { weight });
        (document.fonts as unknown as Set<FontFace>).add(face);
        return face.load();
      }),
    ).then(() => continueRender(handle));
  }, [handle]);
}

const SCENES: Record<SceneId, () => React.JSX.Element> = {
  hook: Hook,
  intro: Intro,
  plan: Plan,
  budget: Budget,
  promise: PromiseScene,
  packing: Packing,
  phone: PhoneScene,
  how: How,
  close: Close,
};

/** Each scene fades in over the end of the one before; only the last fades out. */
function SceneFade({ dur, last, children }: { dur: number; last: boolean; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const opacity = Math.min(
    interpolate(frame, [0, XFADE], [0, 1], clamp),
    last ? interpolate(frame, [dur - 12, dur], [1, 0], clamp) : 1,
  );
  const scale = interpolate(frame, [0, XFADE + 6], [1.015, 1], clamp);
  return <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>{children}</AbsoluteFill>;
}

/** The music starts late enough that its own ending lands on the last frame. */
const MUSIC_AT = 50;

/** The music sits higher in pauses and dips under the voice. */
function musicVolume(frame: number) {
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const gap = Math.min(
    ...lines.map((l) => Math.max(0, l.from - 4 - frame, frame - (l.from + l.dur))),
  );
  const duck = interpolate(gap, [0, 14], [0.13, 0.4], clamp);
  const fade = Math.min(
    interpolate(frame, [MUSIC_AT, MUSIC_AT + 20], [0, 1], clamp),
    interpolate(frame, [TOTAL_FRAMES - 10, TOTAL_FRAMES], [1, 0], clamp),
  );
  return duck * fade;
}

function Captions() {
  const frame = useCurrentFrame();
  const current = lines.find((l) => frame >= l.from - 3 && frame < l.from + l.dur + 6);
  if (!current) return null;
  const opacity = interpolate(
    frame,
    [current.from - 3, current.from + 2, current.from + current.dur + 1, current.from + current.dur + 6],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const spoken = current.words.filter((w) => frame >= current.from + w.t * FPS - 2).length;
  return <Caption words={current.words.map((w) => w.w)} spoken={spoken} opacity={opacity} />;
}

export function Demo() {
  useFonts();
  return (
    <AbsoluteFill style={{ background: "#141414" }}>
      {(Object.keys(SCENES) as SceneId[]).map((id, i, all) => {
        const Scene = SCENES[id];
        const { from, dur } = scenes[id];
        return (
          <Sequence key={id} from={from} durationInFrames={dur} name={id}>
            <SceneFade dur={dur} last={i === all.length - 1}>
              <Scene />
            </SceneFade>
            {i > 0 ? <Sfx name="whoosh" at={0} volume={0.35} /> : null}
          </Sequence>
        );
      })}
      {lines.map((l) => (
        <Sequence key={l.id} from={l.from} durationInFrames={l.dur + 2} name={l.id}>
          <Html5Audio src={staticFile(`vo/${l.id}.mp3`)} />
        </Sequence>
      ))}
      <Sequence from={MUSIC_AT} name="music">
        <Html5Audio src={staticFile("music/bed.mp3")} volume={(f) => musicVolume(f + MUSIC_AT)} />
      </Sequence>
      {getInputProps().poster ? null : <Captions />}
    </AbsoluteFill>
  );
}

export function Root() {
  return (
    <Composition
      id="KitBridgeDemo"
      component={Demo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
