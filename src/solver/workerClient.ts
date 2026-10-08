import workerUrl from "./solver.worker.ts?worker&url";
import { SOLVE_TIMEOUT_MS, WASM_LOAD_TIMEOUT_MS } from "../constants";
import { emptyBuyCounts, emptyKitCounts, consumptionFor, remainderFor, unmetFor } from "../model/interpret";
import { newId } from "../model/ids";
import type { Scenario, SolveMode, SolveOutcome, SolveRequest } from "../types";

type WorkerOutgoing =
  | { type: "ready" }
  | { type: "load-failed"; message?: string }
  | { type: "result"; result: SolveOutcome };

export type SolverHealth =
  | { state: "loading" }
  | { state: "ready" }
  | { state: "load-failed"; message: string };

let worker: Worker | null = null;
let health: SolverHealth = { state: "loading" };
let readyPromise: Promise<void> | null = null;
const listeners = new Set<(health: SolverHealth) => void>();

function setHealth(next: SolverHealth) {
  health = next;
  for (const listener of listeners) listener(next);
}

export function subscribeSolverHealth(listener: (health: SolverHealth) => void): () => void {
  listeners.add(listener);
  listener(health);
  return () => {
    listeners.delete(listener);
  };
}

export function getSolverHealth(): SolverHealth {
  return health;
}

function workerScriptUrl(): string {
  if (import.meta.env.DEV) return workerUrl;
  return new URL("assets/solver.worker.js", document.baseURI).href;
}

function attachWorker(): Worker {
  void workerUrl;
  const next = new Worker(workerScriptUrl(), {
    type: "module",
  });
  worker = next;
  return next;
}

export function initSolver(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise<void>((resolve) => {
    const w = attachWorker();
    const timer = window.setTimeout(() => {
      setHealth({
        state: "load-failed",
        message: "Solver Wasm did not become ready in time. Check that highs.wasm is served same-origin.",
      });
      resolve();
    }, WASM_LOAD_TIMEOUT_MS);

    w.onmessage = (event: MessageEvent<WorkerOutgoing>) => {
      if (event.data.type === "ready") {
        window.clearTimeout(timer);
        setHealth({ state: "ready" });
        resolve();
      }
      if (event.data.type === "load-failed") {
        window.clearTimeout(timer);
        setHealth({
          state: "load-failed",
          message: event.data.message ?? "HiGHS Wasm failed to load from this origin.",
        });
        resolve();
      }
    };
    w.onerror = () => {
      window.clearTimeout(timer);
      setHealth({
        state: "load-failed",
        message: "Solver worker failed to start. The Wasm path is likely wrong on this host.",
      });
      resolve();
    };
    w.postMessage({ type: "init" });
  });
  return readyPromise;
}

function timeoutOutcome(request: SolveRequest, message: string): SolveOutcome {
  const kits = emptyKitCounts(request.scenario);
  const buys = emptyBuyCounts(request.scenario);
  const consumption = consumptionFor(request.scenario, kits);
  return {
    requestId: request.requestId,
    mode: request.mode,
    overallStatus: "Timeout",
    message,
    phase1: {
      status: "Timeout",
      highsStatus: null,
      objective: null,
      message,
    },
    phase2: null,
    kits,
    buys,
    costCents: 0,
    consumption,
    remainder: remainderFor(request.scenario, consumption, buys),
    unmet: unmetFor(request.scenario, kits),
    elapsedMs: SOLVE_TIMEOUT_MS,
  };
}

function loadFailOutcome(request: SolveRequest, message: string): SolveOutcome {
  const kits = emptyKitCounts(request.scenario);
  const buys = emptyBuyCounts(request.scenario);
  const consumption = consumptionFor(request.scenario, kits);
  return {
    requestId: request.requestId,
    mode: request.mode,
    overallStatus: "LoadFailed",
    message,
    phase1: {
      status: "LoadFailed",
      highsStatus: null,
      objective: null,
      message,
    },
    phase2: null,
    kits,
    buys,
    costCents: 0,
    consumption,
    remainder: remainderFor(request.scenario, consumption, buys),
    unmet: unmetFor(request.scenario, kits),
    elapsedMs: 0,
  };
}

export async function solveScenario(
  scenario: Scenario,
  mode: SolveMode,
  requestId = newId("req"),
): Promise<SolveOutcome> {
  await initSolver();
  const request: SolveRequest = {
    requestId,
    scenario,
    mode,
    remainingMs: SOLVE_TIMEOUT_MS,
  };

  if (health.state === "load-failed") {
    return loadFailOutcome(request, health.message);
  }
  if (!worker) {
    return loadFailOutcome(request, "Solver worker is not running.");
  }

  const assigned = worker;
  return new Promise<SolveOutcome>((resolve) => {
    const timer = window.setTimeout(() => {
      assigned.terminate();
      worker = null;
      readyPromise = null;
      setHealth({ state: "loading" });
      void initSolver();
      resolve(timeoutOutcome(request, "Solve exceeded the 2s wall-clock limit. The worker was stopped."));
    }, SOLVE_TIMEOUT_MS + 50);

    const onMessage = (event: MessageEvent<WorkerOutgoing>) => {
      if (event.data.type !== "result") return;
      if (event.data.result.requestId !== requestId) return;
      window.clearTimeout(timer);
      assigned.removeEventListener("message", onMessage);
      resolve(event.data.result);
    };
    assigned.addEventListener("message", onMessage);
    assigned.postMessage({ type: "solve", request });
  });
}
