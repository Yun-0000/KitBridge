/**
 * Resolve a same-origin app-root asset from a module Worker.
 * Never use a site-root path like /highs.wasm — that breaks project Pages.
 */
export function resolveAppAsset(fileName: string): string {
  const injected = (globalThis as { __KITBRIDGE_APP_ROOT?: string }).__KITBRIDGE_APP_ROOT;
  if (injected) return new URL(fileName, injected).href;

  const here = new URL(import.meta.url);
  const assetsMarker = "/assets/";
  const assetsAt = here.pathname.lastIndexOf(assetsMarker);
  if (assetsAt >= 0) {
    const appRoot = `${here.origin}${here.pathname.slice(0, assetsAt + 1)}`;
    return new URL(fileName, appRoot).href;
  }

  const base = import.meta.env.BASE_URL;
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return new URL(fileName, base).href;
  }
  if (base.startsWith("/")) {
    return new URL(base.endsWith("/") ? `${base}${fileName}` : `${base}/${fileName}`, here.origin).href;
  }

  return `${here.origin}/${fileName}`;
}

export function resolveHighsWasmUrl(): string {
  return resolveAppAsset("highs.wasm");
}

export async function loadHighsWasmBinary(): Promise<ArrayBuffer> {
  const wasmUrl = resolveHighsWasmUrl();
  try {
    const direct = await fetch(wasmUrl);
    if (direct.ok) {
      const buffer = await direct.arrayBuffer();
      if (buffer.byteLength > 1024) return buffer;
    }
  } catch {
    // Fall through to the text sidecar used by hosts that cannot store raw Wasm.
  }

  const sidecar = resolveAppAsset("highs.wasm.b64");
  try {
    const response = await fetch(sidecar);
    if (response.ok) {
      return decodeBase64Wasm(await response.text());
    }
  } catch {
    // Fall through to chunked sidecar for hosts with small file APIs.
  }

  if (globalThis.location?.origin === "https://cdn.jsdelivr.net") {
    const npmWasm = "https://cdn.jsdelivr.net/npm/highs@1.15.3/build/highs.wasm";
    const npmRes = await fetch(npmWasm);
    if (npmRes.ok) return npmRes.arrayBuffer();
  }

  const manifestUrl = resolveAppAsset("highs.wasm.json");
  const manifestRes = await fetch(manifestUrl);
  if (!manifestRes.ok) {
    throw new Error(`HiGHS Wasm missing at ${wasmUrl}, ${sidecar}, and ${manifestUrl}`);
  }
  const manifest = (await manifestRes.json()) as { parts: string[] };
  const chunks = await Promise.all(
    manifest.parts.map(async (name) => {
      const part = await fetch(resolveAppAsset(name));
      if (!part.ok) throw new Error(`Missing Wasm part ${name}`);
      return part.text();
    }),
  );
  return decodeBase64Wasm(chunks.join(""));
}

function decodeBase64Wasm(text: string): ArrayBuffer {
  const compact = text.replace(/\s+/g, "");
  const raw = atob(compact);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}
