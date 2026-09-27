import loadHighs from "highs";
import type { Highs } from "highs";
import { runTwoPhase } from "./runTwoPhase";
import { loadHighsWasmBinary, resolveHighsWasmUrl } from "./wasmUrl";
import type { SolveRequest } from "../types";

type Incoming =
  | { type: "init" }
  | { type: "solve"; request: SolveRequest };

let highs: Highs | null = null;
let initError: string | null = null;

async function ensureHighs(): Promise<Highs> {
  if (highs) return highs;
  if (initError) throw new Error(initError);
  const wasmUrl = resolveHighsWasmUrl();
  const wasmBinary = await loadHighsWasmBinary();
  highs = await loadHighs({
    wasmBinary,
    locateFile: (file) => (file.endsWith(".wasm") ? wasmUrl : file),
  });
  return highs;
}

self.onmessage = async (event: MessageEvent<Incoming>) => {
  const data = event.data;
  if (data.type === "init") {
    try {
      await ensureHighs();
      self.postMessage({ type: "ready" });
    } catch (error) {
      initError = error instanceof Error ? error.message : "Wasm load failed.";
      highs = null;
      self.postMessage({ type: "load-failed", message: initError });
    }
    return;
  }

  if (data.type === "solve") {
    try {
      const instance = await ensureHighs();
      const result = runTwoPhase(instance, data.request);
      self.postMessage({ type: "result", result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Worker solve failed.";
      self.postMessage({
        type: "result",
        result: {
          requestId: data.request.requestId,
          mode: data.request.mode,
          overallStatus: "Error",
          message,
          phase1: {
            status: "Error",
            highsStatus: null,
            objective: null,
            message,
          },
          phase2: null,
          kits: {},
          buys: {},
          costCents: 0,
          consumption: {},
          remainder: {},
          unmet: {},
          elapsedMs: 0,
        },
      });
    }
  }
};
