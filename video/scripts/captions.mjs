// Writes ../public/demo/captions.vtt from the same timeline the film uses.
import { buildSync } from "esbuild";
import { writeFileSync } from "node:fs";

const { outputFiles } = buildSync({
  entryPoints: [new URL("../src/timeline.ts", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  write: false,
});
const { lines, FPS } = await import(`data:text/javascript,${encodeURIComponent(outputFiles[0].text)}`);

const ts = (frame) => new Date((frame / FPS) * 1000).toISOString().slice(11, 23);
const cues = lines.map((l) => `${ts(l.from)} --> ${ts(l.from + l.dur)}\n${l.text}`);
writeFileSync(new URL("../../public/demo/captions.vtt", import.meta.url), `WEBVTT\n\n${cues.join("\n\n")}\n`);
console.log(`${cues.length} cues`);
