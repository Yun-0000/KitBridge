import narration from "./timeline.json";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export type SceneId =
  | "hook"
  | "intro"
  | "plan"
  | "budget"
  | "promise"
  | "packing"
  | "phone"
  | "how"
  | "close";

const ORDER: SceneId[] = [
  "hook",
  "intro",
  "plan",
  "budget",
  "promise",
  "packing",
  "phone",
  "how",
  "close",
];

/** Seconds of silence before the first line, between lines and after the last. */
const LEAD = 0.5;
const GAP = 0.45;
const TAIL: Partial<Record<SceneId, number>> = { phone: 1.8, close: 4 };
const DEFAULT_TAIL = 1.1;
/** Frames each scene crossfades over the end of the previous one. */
export const XFADE = 10;

export type Line = {
  id: string;
  scene: SceneId;
  text: string;
  /** Absolute start frame. */
  from: number;
  /** Length in frames. */
  dur: number;
  /** Each word with its start, in seconds from the line start. */
  words: { w: string; t: number }[];
};

const f = (seconds: number) => Math.round(seconds * FPS);

export const lines: Line[] = [];
export const scenes = {} as Record<SceneId, { from: number; dur: number }>;

let cursor = 0;
for (const scene of ORDER) {
  const start = cursor;
  let t = start + f(LEAD);
  for (const line of narration.filter((l) => l.scene === scene)) {
    lines.push({ id: line.id, scene, text: line.text, from: t, dur: f(line.seconds), words: line.words });
    t += f(line.seconds) + f(GAP);
  }
  cursor = t - f(GAP) + f(TAIL[scene] ?? DEFAULT_TAIL);
  scenes[scene] = { from: start, dur: cursor - start };
  cursor -= XFADE;
}
cursor += XFADE;

export const TOTAL_FRAMES = cursor;

export function line(id: string): Line {
  const found = lines.find((l) => l.id === id);
  if (!found) throw new Error(`No narration line ${id}`);
  return found;
}

/**
 * A frame inside a scene, anchored to a narration line: `at("L05", 0.5)` is
 * halfway through line L05, relative to the start of that line's scene.
 */
export function at(id: string, fraction = 0, offsetFrames = 0): number {
  const l = line(id);
  return l.from - scenes[l.scene].from + Math.round(l.dur * fraction) + offsetFrames;
}
