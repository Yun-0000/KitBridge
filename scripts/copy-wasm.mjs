import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/highs/build/highs.wasm");
const destDir = resolve(root, "public");
mkdirSync(destDir, { recursive: true });
copyFileSync(src, resolve(destDir, "highs.wasm"));
const b64 = readFileSync(src).toString("base64");
writeFileSync(resolve(destDir, "highs.wasm.b64"), b64);
const partSize = 90_000;
const parts = [];
for (let offset = 0; offset < b64.length; offset += partSize) {
  const name = `highs.wasm.b64.${parts.length}`;
  writeFileSync(resolve(destDir, name), b64.slice(offset, offset + partSize));
  parts.push(name);
}
writeFileSync(resolve(destDir, "highs.wasm.json"), `${JSON.stringify({ parts }, null, 2)}\n`);
console.log(`copied highs.wasm, sidecar, and ${parts.length} text parts to public/`);
